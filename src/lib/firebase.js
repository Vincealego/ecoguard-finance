import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, getDocs, getDoc, setDoc, doc,
  query, where, orderBy, serverTimestamp, updateDoc, onSnapshot,
} from 'firebase/firestore';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from 'firebase/auth';
import {
  getStorage, ref as storageRef, uploadString, getDownloadURL,
} from 'firebase/storage';

// ─── Firebase configuration ───────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app, db, auth, storage;
if (isFirebaseConfigured) {
  app     = initializeApp(firebaseConfig);
  db      = getFirestore(app);
  auth    = getAuth(app);
  storage = getStorage(app);
}
export { db, auth, storage };

function requireFirebase() {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not configured. Add VITE_FIREBASE_* environment variables before using authentication or data features.'
    );
  }
}

// ── Authentication ────────────────────────────────────────────────────────────
export const registerUser = async ({ email, password, displayName, phone, county }) => {
  requireFirebase();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName, phone: phone || '', county: county || '',
    email, role: 'applicant', createdAt: serverTimestamp(),
  });
  return cred.user;
};

export const loginUser = async ({ email, password }) => {
  requireFirebase();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const logoutUser = async () => { requireFirebase(); await signOut(auth); };

export const onAuth = (callback) => {
  if (!isFirebaseConfigured) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) { callback(null); return; }
    try {
      const snap    = await getDoc(doc(db, 'users', firebaseUser.uid));
      const profile = snap.exists() ? snap.data() : {};
      callback({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, ...profile });
    } catch {
      callback({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'applicant' });
    }
  });
};

export const getUserProfile = async (uid) => {
  requireFirebase();
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

// ── File upload — Storage with Firestore sub-collection fallback ──────────────
// Strategy:
//   1. Try Firebase Storage (fast, scalable, no size limit)
//   2. If Storage fails (CORS / rules not set yet), store the compressed file
//      in a Firestore sub-collection document instead so submission never blocks.

async function compressDataUrl(dataUrl, maxWidth = 1200, quality = 0.78) {
  // Only compress images
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale  = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback: return original
    img.src = dataUrl;
  });
}

export const uploadDocumentToStorage = async (userId, applicationId, key, fileObj) => {
  if (!fileObj?.data) return null;
  requireFirebase();

  const ext     = (fileObj.name.split('.').pop() || 'bin').toLowerCase();
  const path    = `documents/${userId}/${applicationId}/${key}.${ext}`;
  const fileRef = storageRef(storage, path);

  await uploadString(fileRef, fileObj.data, 'data_url');
  const url = await getDownloadURL(fileRef);
  return { name: fileObj.name, size: fileObj.size, type: fileObj.type, url, path, stored: 'storage' };
};

// ── Applications ──────────────────────────────────────────────────────────────
export const submitApplication = async (data) => {
  requireFirebase();
  const { documents, userId, ...rest } = data;

  // ── Step 1: Save application to Firestore IMMEDIATELY ──────────────────────
  // User sees success right away. Documents upload in the background.
  const appRef = await addDoc(collection(db, 'applications'), {
    ...rest,
    userId,
    status: 'submitted',
    statusHistory: [{
      status: 'submitted',
      date: new Date().toISOString(),
      note: 'Application submitted and queued for review.',
    }],
    documents: {},        // filled in background
    docsUploading: true,  // flag so admin knows uploads are in progress
    createdAt: serverTimestamp(),
  });
  const applicationId = appRef.id;

  // ── Step 2: Upload files in background (do NOT await this) ─────────────────
  // We fire-and-forget so the user reaches the success screen in ~1 second.
  uploadDocumentsInBackground(userId, applicationId, documents);

  return applicationId;
};

// Runs completely in the background after the user sees success
async function uploadDocumentsInBackground(userId, applicationId, documents) {
  const finish = async (uploadedDocs) => {
    try {
      await updateDoc(doc(db, 'applications', applicationId), {
        documents: uploadedDocs,
        docsUploading: false,
      });
    } catch (e) {
      console.warn('Could not update document metadata:', e.message);
    }
  };

  if (!documents || typeof documents !== 'object') { await finish({}); return; }
  const entries = Object.entries(documents).filter(([, v]) => v?.data);
  if (entries.length === 0) { await finish({}); return; }

  const uploadedDocs = {};

  await Promise.allSettled(
    entries.map(async ([key, fileObj]) => {
      // Try Firebase Storage first
      try {
        const ext     = (fileObj.name.split('.').pop() || 'bin').toLowerCase();
        const path    = `documents/${userId}/${applicationId}/${key}.${ext}`;
        const fileRef = storageRef(storage, path);
        await uploadString(fileRef, fileObj.data, 'data_url');
        const url = await getDownloadURL(fileRef);
        uploadedDocs[key] = { name: fileObj.name, size: fileObj.size, type: fileObj.type, url, path, stored: 'storage' };
        return;
      } catch (storageErr) {
        console.warn(`Storage failed for ${key}:`, storageErr.message);
      }

      // Fallback: Firestore sub-collection
      try {
        const compressed = await compressDataUrl(fileObj.data);
        await setDoc(
          doc(db, 'applications', applicationId, 'documents', key),
          { name: fileObj.name, size: fileObj.size, type: fileObj.type, data: compressed, stored: 'firestore' }
        );
        uploadedDocs[key] = { name: fileObj.name, size: fileObj.size, type: fileObj.type, stored: 'firestore' };
      } catch (fbErr) {
        console.warn(`Firestore fallback failed for ${key}:`, fbErr.message);
        uploadedDocs[key] = { name: fileObj.name, size: fileObj.size, type: fileObj.type, error: fbErr.message };
      }
    })
  );

  await finish(uploadedDocs);
}


export const getApplicationsForUser = async (uid) => {
  requireFirebase();
  const q    = query(collection(db, 'applications'), where('userId', '==', uid));
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => {
    const t = v => !v ? 0 : typeof v.toMillis === 'function' ? v.toMillis() : new Date(v).getTime();
    return t(b.createdAt) - t(a.createdAt);
  });
};

// ── Admin document fetching (handles both Storage URL and Firestore fallback) ─
export const getApplicationDocuments = async (applicationId) => {
  requireFirebase();
  const subSnap = await getDocs(collection(db, 'applications', applicationId, 'documents'));
  const result  = {};
  subSnap.docs.forEach(d => { result[d.id] = d.data(); });
  return result; // keyed by doc key e.g. 'identity', 'logbook', etc.
};

// ── Admin / review ────────────────────────────────────────────────────────────
export const getAllApplications = async () => {
  requireFirebase();
  const q    = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToApplications = (callback) => {
  if (!isFirebaseConfigured) return () => {};
  const q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const updateApplicationStatus = async (applicationId, newStatus, note = '') => {
  requireFirebase();
  const ref  = doc(db, 'applications', applicationId);
  const snap = await getDoc(ref);
  const existingHistory = snap.data()?.statusHistory || [];
  await updateDoc(ref, {
    status: newStatus,
    statusHistory: [...existingHistory, { status: newStatus, date: new Date().toISOString(), note }],
  });
};

export const getAllUsers = async () => {
  requireFirebase();
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
};

// ── Disbursements ─────────────────────────────────────────────────────────────
export const recordDisbursement = async ({
  applicationId, applicantName, applicantPhone, applicantEmail,
  amount, currency = 'KES', channel, reference, note, initiatedBy,
  mpesaCheckoutRequestId,
}) => {
  requireFirebase();
  const ref = await addDoc(collection(db, 'disbursements'), {
    applicationId, applicantName, applicantPhone, applicantEmail,
    amount: Number(amount), currency, channel, reference: reference || '',
    note: note || '', initiatedBy, mpesaCheckoutRequestId: mpesaCheckoutRequestId || '',
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateDisbursementStatus = async (disbursementId, status, details = '') => {
  requireFirebase();
  await updateDoc(doc(db, 'disbursements', disbursementId), {
    status, statusDetails: details, updatedAt: serverTimestamp(),
  });
};

export const subscribeToDisbursements = (callback) => {
  if (!isFirebaseConfigured) return () => {};
  const q = query(collection(db, 'disbursements'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const getDisbursementsForApplication = async (applicationId) => {
  requireFirebase();
  const q    = query(collection(db, 'disbursements'), where('applicationId', '==', applicationId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
