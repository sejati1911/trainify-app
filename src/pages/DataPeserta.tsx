import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
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
  const [pesertaList, setPesertaList] = useState<Peserta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Form Input
  const [perner, setPerner] = useState('');
  const [nama, setNama] = useState('');
  const [gender, setGender] = useState('Laki-laki');
  const [position, setPosition] = useState('');
  const [asalPersero, setAsalPersero] = useState('');
  const [lokasiPersero, setLokasiPersero] = useState('');
  const [formOpen, setFormOpen] = useState(false);

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

  const handleAddPeserta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Deteksi jika perner adalah angka, parse ke Number untuk menghindari type mismatch
      const parsedPerner = isNaN(Number(perner)) ? perner : Number(perner);

      const { error } = await supabase
        .from('data_peserta')
        .insert([{
          perner: parsedPerner,
          nama_peserta: nama,
          gender,
          job_position: position,
          asal_perusahaan: asalPersero,
          lokasi_perusahaan: lokasiPersero
        }]);

      if (error) throw error;
      
      // Reset Form
      setPerner('');
      setNama('');
      setPosition('');
      setAsalPersero('');
      setLokasiPersero('');
      setFormOpen(false);
      
      fetchPeserta();
    } catch (err: any) {
      alert(`Gagal menambah peserta: ${err.message || 'Periksa duplikasi PERNER'}`);
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus peserta ini?')) return;
    try {
      const { error } = await supabase
        .from('data_peserta')
        .delete()
        .eq('id_peserta', id);

      if (error) throw error;
      fetchPeserta();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
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
          <h1 className="text-2xl font-bold text-sky-400">Data Peserta</h1>
          <p className="text-sm text-slate-400">Manajemen database induk karyawan & peserta diklat</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={fetchPeserta}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center space-x-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{formOpen ? 'Tutup Form' : 'Tambah Karyawan'}</span>
          </button>
        </div>
      </div>

      {formOpen && (
        <form onSubmit={handleAddPeserta} className="bg-slate-800 p-6 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">PERNER</label>
            <input type="text" required value={perner} onChange={e => setPerner(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="Contoh: 18062026" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nama Lengkap</label>
            <input type="text" required value={nama} onChange={e => setNama(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="Nama Peserta" />
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
          <div className="flex flex-col justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Lokasi Kerja</label>
              <input type="text" required value={lokasiPersero} onChange={e => setLokasiPersero(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="Semarang" />
            </div>
            <button type="submit" className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center space-x-1">
              <Plus className="w-4 h-4" /> <span>Simpan Record</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500 font-mono">Menyelaraskan tabel...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-850 border-b border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  <th className="p-4">ID</th>
                  <th className="p-4">PERNER</th>
                  <th className="p-4">Nama</th>
                  <th className="p-4">Posisi</th>
                  <th className="p-4">Perusahaan</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm text-slate-200">
                {pesertaList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">Belum ada data peserta.</td>
                  </tr>
                ) : (
                  pesertaList.map((item) => (
                    <tr key={item.id_peserta} className="hover:bg-slate-750/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-500">{item.id_peserta}</td>
                      <td className="p-4 font-mono text-sky-400 font-medium">{item.perner}</td>
                      <td className="p-4 font-semibold">{item.nama_peserta} <span className="text-xs font-normal text-slate-500">({item.gender === 'Laki-laki' ? 'L' : 'P'})</span></td>
                      <td className="p-4 text-slate-300">{item.job_position}</td>
                      <td className="p-4 text-slate-400">{item.asal_perusahaan} <span className="text-xs bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 ml-1">{item.lokasi_perusahaan}</span></td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleDelete(item.id_peserta)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
  );
};