import { useState, useEffect } from 'react';
import { Search, ShieldCheck, User } from 'lucide-react';
import { getAllUsers } from '../../lib/firebase';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllUsers().then(data => { setUsers(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.county?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink font-display">Users</h1>
        <p className="text-slate-500 text-sm mt-1">All registered applicants and administrators on the platform.</p>
      </div>

      <div className="relative mb-5 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" className="input pl-9"
          placeholder="Search by name, email, or county"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>County</th>
              <th>Phone</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading users…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">No users found.</td></tr>
            ) : (
              filtered.map(u => (
                <tr key={u.uid}>
                  <td className="font-medium">{u.displayName || '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.county || '—'}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-700'}`}>
                      {u.role === 'admin' ? <ShieldCheck size={11} /> : <User size={11} />}
                      {u.role === 'admin' ? 'Administrator' : 'Applicant'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Administrator roles are granted by a database administrator directly in Firestore and cannot be
        self-assigned through the platform UI.
      </p>
    </div>
  );
}
