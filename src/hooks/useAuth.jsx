import { createContext, useContext, useEffect, useState } from 'react';
import { onAuth, logoutUser, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = auth state still loading

  useEffect(() => {
    const unsubscribe = onAuth((profile) => setUser(profile ?? null));
    return unsubscribe;
  }, []);

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      loading: user === undefined,
      isAdmin,
      isFirebaseConfigured,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
