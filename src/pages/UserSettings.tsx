import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const UserSettings: React.FC = () => {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States Input Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [perner, setPerner] = useState('');
  const [namaPeserta, setNamaPeserta] = useState('');
  const [jobPosition, setJobPosition] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('access_login')
        .select(`
          username, role, perner,
          data_peserta (nama_peserta, job_position)
        `);
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error: pError } = await supabase
        .from('data_peserta')
        .insert([{ perner, nama_peserta: namaPeserta, job_position: jobPosition, asal_perusahaan: 'PT. Indonesia Bangun Digital' }]);
      if (pError) throw pError;

      const { error: lError } = await supabase
        .from('access_login')
        .insert([{ username, password, role, perner }]);
      if (lError) throw lError;

      alert('User berhasil didaftarkan!');
      setUsername(''); setPassword(''); setPerner(''); setNamaPeserta(''); setJobPosition('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-6 text-white space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sky-400">Manajemen Pengguna</h1>
        <p className="text-sm text-slate-400 font-mono">Registrasi Otorisasi Akun & Profil Karyawan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleCreateUser} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3 h-fit">
          <input type="text" required placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" />
          <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" />
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <input type="text" required placeholder="PERNER" value={perner} onChange={e => setPerner(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" />
          <input type="text" required placeholder="Nama Lengkap" value={namaPeserta} onChange={e => setNamaPeserta(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" />
          <input type="text" required placeholder="Jabatan" value={jobPosition} onChange={e => setJobPosition(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" />
          <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2 rounded-lg font-bold text-xs hover:bg-sky-400 cursor-pointer">
            Daftarkan Akun
          </button>
        </form>

        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? <p className="p-4 text-xs">Loading...</p> : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-mono">
                <tr>
                  <th className="p-3">Username</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-slate-200">
                {usersList.map(u => (
                  <tr key={u.username} className="hover:bg-slate-750/20">
                    <td className="p-3 font-mono">{u.username}</td>
                    <td className="p-3 font-semibold text-sky-400">{u.data_peserta?.nama_peserta || '-'}</td>
                    <td className="p-3 uppercase font-mono text-slate-400">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};