import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import bcrypt from 'bcryptjs'; // <-- Impor bcrypt untuk mengamankan enkripsi password
import { Edit2, Trash2, X, RefreshCw } from 'lucide-react';

export const UserSettings: React.FC = () => {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States Kontrol Mode Form
  const [isEditing, setIsEditing] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editingPerner, setEditingPerner] = useState<string | number | null>(null);

  // States Input Form (Tabel access_login)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [perner, setPerner] = useState('');

  // States Input Form Profil Karyawan (Tabel data_peserta)
  const [namaPeserta, setNamaPeserta] = useState('');
  const [jobPosition, setJobPosition] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // 1. Ambil data mentah akun login
      const { data: accessData, error: errAccess } = await supabase
        .from('access_login')
        .select('*');
      if (errAccess) throw errAccess;

      // 2. Ambil data induk peserta secara terpisah
      const { data: pesertaData } = await supabase
        .from('data_peserta')
        .select('perner, nama_peserta, job_position');
      
      const profilMap = pesertaData || [];

      // 3. Satukan data di memori secara aman
      const combinedData = (accessData || []).map((u: any) => {
        const matchProfil = profilMap.find(p => String(p.perner) === String(u.perner));
        return {
          ...u,
          data_peserta: matchProfil || null
        };
      });

      setUsersList(combinedData);
    } catch (err) {
      console.error('Gagal memuat data pengguna:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingUsername(null);
    setEditingPerner(null);
    setUsername('');
    setPassword('');
    setRole('User');
    setPerner('');
    setNamaPeserta('');
    setJobPosition('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedPerner = perner.trim() === '' ? null : (isNaN(Number(perner)) ? perner : Number(perner));

      // 🌟 PROSES ENKRIPSI PASSWORD SEBELUM DIKIRIM KE SUPABASE
      // Menggunakan salt rounds sebesar 10 (standar keamanan optimal)
      const hashedPassword = await bcrypt.hash(password, 10);

      if (isEditing && editingUsername) {
        // --- PROSES UPDATE / EDIT MODE ---
        
        // 1. Jika perner lama ada, perbarui data di data_peserta
        if (editingPerner && role === 'User') {
          await supabase
            .from('data_peserta')
            .update({
              perner: parsedPerner,
              nama_peserta: namaPeserta,
              job_position: jobPosition
            })
            .eq('perner', editingPerner);
        }

        // 2. Update kredensial login di access_login dengan password ter-hash
        const { error: lUpdateError } = await supabase
          .from('access_login')
          .update({
            username: username,
            password: hashedPassword, // <-- Kirim password hasil hash
            role: role,
            perner: parsedPerner
          })
          .eq('username', editingUsername);

        if (lUpdateError) throw lUpdateError;
        alert('User dan password baru berhasil diperbarui secara aman!');
      } else {
        // --- PROSES CREATE / ADD MODE ---
        
        // Cek duplikasi username di lokal state sebelum kirim ke database
        const isExist = usersList.some(u => String(u.username).toLowerCase() === username.trim().toLowerCase());
        if (isExist) return alert(`Username '${username}' sudah terdaftar di sistem!`);

        // 1. Jika rolenya User dan perner diisi, buat profilnya di data_peserta dulu
        if (role === 'User' && parsedPerner) {
          const { error: pError } = await supabase
            .from('data_peserta')
            .insert([{ 
              perner: parsedPerner, 
              nama_peserta: namaPeserta || 'Karyawan Baru', 
              job_position: jobPosition || 'Staff IT', 
              asal_perusahaan: 'PT. Indonesia Bangun Digital',
              gender: 'Laki-laki',
              lokasi_perusahaan: 'Pusat'
            }]);
          if (pError) console.warn("Peringatan profil terduplikasi:", pError.message);
        }

        // 2. Daftarkan kredensial login ke tabel access_login dengan password ter-hash
        const { error: lError } = await supabase
          .from('access_login')
          .insert([{ username, password: hashedPassword, role, perner: parsedPerner }]); // <-- Simpan hashed password
        if (lError) throw lError;

        alert('Akun baru berhasil didaftarkan dengan password aman!');
      }

      resetForm();
      fetchUsers();
    } catch (err: any) {
      alert('Gagal menyimpan data: ' + err.message);
    }
  };

  const startEditUser = (u: any) => {
    setIsEditing(true);
    setEditingUsername(u.username);
    setEditingPerner(u.perner);

    setUsername(u.username);
    setPassword(''); // Kosongkan form password demi keamanan saat edit, wajib isi ulang jika ganti data
    setRole(u.role || 'User');
    setPerner(u.perner ? String(u.perner) : '');
    setNamaPeserta(u.data_peserta?.nama_peserta || '');
    setJobPosition(u.data_peserta?.job_position || '');
  };

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`Hapus akun login '${u.username}' secara permanen?`)) return;
    try {
      // 1. Hapus data kredensial login di access_login
      const { error: lDelError } = await supabase
        .from('access_login')
        .delete()
        .eq('username', u.username);
      if (lDelError) throw lDelError;

      // 2. Tawarkan hapus data peserta terikat jika profilnya ada
      if (u.perner && confirm(`Apakah Anda juga ingin menghapus profil karyawan dengan PERNER ${u.perner} di data_peserta?`)) {
        await supabase
          .from('data_peserta')
          .delete()
          .eq('perner', u.perner);
      }

      alert('Proses hapus sukses dieksekusi!');
      fetchUsers();
    } catch (err: any) {
      alert('Gagal menghapus data: ' + err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-6 text-slate-800 dark:text-white space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">User Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">Registrasi Otorisasi Akun & Profil Karyawan Terintegrasi (Enkripsi Bcrypt Active)</p>
        </div>
        <button onClick={fetchUsers} disabled={loading} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-700 border border-sky-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM OPERASIONAL */}
        <form onSubmit={handleSaveUser} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-3 h-fit">
          <div className="flex justify-between items-center border-b border-sky-200/60 dark:border-slate-700/50 pb-2">
            <h3 className="font-bold text-sky-400 text-xs uppercase font-mono tracking-wider">
              {isEditing ? 'Koreksi Data Akun' : 'Daftarkan Akun Baru'}
            </h3>
            {isEditing && (
              <button type="button" onClick={resetForm} className="text-slate-500 dark:text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">USERNAME</label>
            <input type="text" required placeholder="Username Akun" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:outline-none" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">PASSWORD {isEditing && '(Ketik Baru untuk Ubah)'}</label>
            <input type="password" required placeholder="Ketik Password Baru" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:outline-none" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">HAK AKSES ROLE</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:outline-none">
              <option value="User">User</option>
              <option value="Admin">Admin</option>
              <option value="SPV">SPV</option>
            </select>
          </div>

          <div className="border-t border-sky-200/60 dark:border-slate-700/60 pt-2 space-y-3">
            <p className="text-[10px] font-bold font-mono text-amber-400 uppercase tracking-wide">📦 Sinkronisasi Profil Karyawan</p>
            
            <div>
             
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">NOMOR PERNER</label>
              <input
                type="text"
                readOnly
                placeholder="Terisi otomatis"
                value={perner}
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">NAMA LENGKAP</label>
              <input
                type="text"
                readOnly
                placeholder="Terisi otomatis"
                value={namaPeserta}
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">JABATAN</label>
              <input
                type="text"
                readOnly
                placeholder="Terisi otomatis"
                value={jobPosition}
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2.5 rounded-lg font-bold text-xs hover:bg-sky-400 transition-all cursor-pointer">
            {isEditing ? 'Simpan Pembaruan User' : 'Daftarkan Akun'}
          </button>
        </form>

        {/* TABEL DATA MANAJEMEN USER */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <p className="p-4 text-xs font-mono text-slate-400 dark:text-slate-500 animate-pulse">Menyelaraskan data...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sky-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono border-b border-sky-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Username</th>
                    <th className="p-3">PERNER</th>
                    <th className="p-3">Nama Karyawan</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                  {usersList.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-400 dark:text-slate-500 font-mono">Belum ada akun terdaftar.</td></tr>
                  ) : (
                    usersList.map(u => (
                      <tr key={u.username} className="hover:bg-sky-50 dark:hover:bg-slate-500/50 transition-colors">
                        <td className="p-3 font-mono font-medium text-slate-600 dark:text-slate-300">{u.username}</td>
                        <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{u.perner || '-'}</td>
                        <td className="p-3 font-semibold text-sky-400">
                          {u.data_peserta?.nama_peserta || (
                            <span className="text-amber-500 text-[11px] font-mono border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 rounded">
                              ⚠️ Profil Terhapus
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            u.role === 'Admin' || u.role === 'admin' ? 'bg-red-500/10 text-red-400' : u.role === 'SPV' || u.role === 'spv' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center items-center space-x-3">
                            <button type="button" onClick={() => startEditUser(u)} className="text-amber-400 hover:text-amber-500 cursor-pointer" title="Edit Akun & Profil">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDeleteUser(u)} className="text-red-400 hover:text-red-500 cursor-pointer" title="Hapus User">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};