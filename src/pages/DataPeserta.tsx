import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, UserPlus, RefreshCw } from 'lucide-react';

interface Peserta {
  id_peserta: number;
  perner: number | string;
  nama_peserta: string;
  gender: string;
  job_position: string;
  asal_perusahaan: string;
  lokasi_perusahaan: string;
}

export const DataPeserta: React.FC = () => {
  const { user } = useAuth();
  const [pesertaList, setPesertaList] = useState<Peserta[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentRole = user && user.role ? String(user.role).toLowerCase() : 'user';
  const isSpv = currentRole === 'spv';

  // State Form Input
  const [perner, setPerner] = useState('');
  const [nama, setNama] = useState('');
  const [gender, setGender] = useState('Laki-laki');
  const [position, setPosition] = useState('');
  const [asalPersero, setAsalPersero] = useState('');
  const [lokasiPersero, setLokasiPersero] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  // State Tambahan untuk Password Akun Login Baru
  const [passwordDefault, setPasswordDefault] = useState('');

  const fetchPeserta = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('data_peserta')
        .select('*')
        .order('id_peserta', { ascending: true });
      
      if (error) throw error;
      setPesertaList(data || []);
    } catch (err) {
      console.error('Gagal memuat data peserta:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPesertaDanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSpv) return alert('Akses ditolak: Supervisor tidak memiliki izin menambah data.');
    if (!passwordDefault) return alert('Sertakan password login default untuk akun karyawan ini!');
    
    try {
      const parsedPerner = isNaN(Number(perner)) ? perner : Number(perner);
      const usernameInput = String(perner).trim();

      // Cek dulu apakah username/PERNER ini sudah terdaftar di access_login
      const { data: existingUser } = await supabase
        .from('access_login')
        .select('username')
        .eq('username', usernameInput)
        .maybeSingle();

      if (existingUser) {
        throw new Error(`PERNER/Username '${usernameInput}' sudah memiliki akun login di sistem!`);
      }

      // A. Masukkan data ke profil karyawan (data_peserta)
      const { data: insertedPeserta, error: errorPeserta } = await supabase
        .from('data_peserta')
        .insert([{
          perner: parsedPerner,
          nama_peserta: nama,
          gender,
          job_position: position,
          asal_perusahaan: asalPersero,
          lokasi_perusahaan: lokasiPersero
        }])
        .select()
        .single();

      if (errorPeserta) throw errorPeserta;

      // B. Otomatis buatkan akun login di tabel access_login linked dengan USERNAME = PERNER
      const { error: errorAccess } = await supabase
        .from('access_login')
        .insert([{
          username: usernameInput,
          password: passwordDefault,
          role: 'User' // Kunci otomatis sebagai 'User' sesuai format Capital Case database
        }]);

      if (errorAccess) {
        // Rollback data peserta jika akun login gagal dibuat agar tidak berserakan
        await supabase.from('data_peserta').delete().eq('id_peserta', insertedPeserta.id_peserta);
        throw errorAccess;
      }

      alert(`Sukses mendaftarkan ${nama} beserta akun login sistem (Username: ${usernameInput})!`);
      
      // Reset Form
      setPerner('');
      setNama('');
      setPosition('');
      setAsalPersero('');
      setLokasiPersero('');
      setPasswordDefault('');
      setFormOpen(false);
      
      fetchPeserta();
    } catch (err: any) {
      alert(`Gagal memproses data: ${err.message}`);
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (isSpv) return;
    if (!confirm('Menghapus peserta ini juga disarankan menghapus akun terkait di User Settings. Lanjutkan hapus profil?')) return;
    try {
      const { error } = await supabase
        .from('data_peserta')
        .delete()
        .eq('id_peserta', id);

      if (error) throw error;
      fetchPeserta();
    } catch (err: any) {
      alert(`Gagal menghapus profil: ${err.message}`);
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPeserta();
  }, []);

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">
            {isSpv ? 'Monitoring Karyawan' : 'Data Peserta & Akun'}
          </h1>
          <p className="text-sm text-slate-400">
            {isSpv ? 'Mode Monitoring: Memantau data semua peserta.' : 'Manajemen peserta pelatihan dan pendaftaran akses login.'}
          </p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={fetchPeserta}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {!isSpv && (
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="flex items-center space-x-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 py-2.5 rounded-lg text-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{formOpen ? 'Tutup' : 'Tambah Peserta + User'}</span>
            </button>
          )}
        </div>
      </div>

      {/* FORM INPUT DUA-DALAM-SATU */}
      {!isSpv && formOpen && (
        <form onSubmit={handleAddPesertaDanUser} className="bg-slate-800 p-6 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">PERNER (Username)</label>
            <input type="text" required value={perner} onChange={e => setPerner(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="Contoh: 18062026" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nama Lengkap</label>
            <input type="text" required value={nama} onChange={e => setNama(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="Nama Lengkap" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500">
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Jabatan / Posisi</label>
            <input type="text" required value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="IT Support" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Asal Perusahaan</label>
            <input type="text" required value={asalPersero} onChange={e => setAsalPersero(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="PT / Unit Kerja" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Lokasi Kerja</label>
            <input type="text" required value={lokasiPersero} onChange={e => setLokasiPersero(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="Semarang" />
          </div>
          <div className="md:col-span-3 border-t border-slate-700/60 pt-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-amber-400 uppercase mb-1">Password Default Login Sistem</label>
              <input type="password" required value={passwordDefault} onChange={e => setPasswordDefault(e.target.value)} className="w-full bg-slate-900 border border-amber-500/30 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-400" placeholder="Ketik password awal akun karyawan..." />
            </div>
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center space-x-1">
              <Plus className="w-4 h-4" /> <span>Tambah Peserta</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW TABEL INDUK */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500 font-mono">Menyelaraskan tabel...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-850 border-b border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  <th className="p-4">ID</th>
                  <th className="p-4">PERNER / USERNAME</th>
                  <th className="p-4">Nama</th>
                  <th className="p-4">Posisi</th>
                  <th className="p-4">Perusahaan</th>
                  {!isSpv && <th className="p-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm text-slate-200">
                {pesertaList.length === 0 ? (
                  <tr><td colSpan={isSpv ? 5 : 6} className="p-6 text-center text-slate-500">Belum ada data peserta.</td></tr>
                ) : (
                  pesertaList.map((item) => (
                    <tr key={item.id_peserta} className="hover:bg-slate-750/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-500">{item.id_peserta}</td>
                      <td className="p-4 font-mono text-sky-400 font-medium">{item.perner}</td>
                      <td className="p-4 font-semibold">{item.nama_peserta} <span className="text-xs font-normal text-slate-500">({item.gender === 'Laki-laki' ? 'L' : 'P'})</span></td>
                      <td className="p-4 text-slate-300">{item.job_position}</td>
                      <td className="p-4 text-slate-400">{item.asal_perusahaan} <span className="text-xs bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 ml-1">{item.lokasi_perusahaan}</span></td>
                      
                      {!isSpv && (
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleDelete(item.id_peserta)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded transition-all cursor-pointer"
                            title="Hapus Profil Karyawan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};