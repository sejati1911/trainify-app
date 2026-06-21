import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RefreshCw, Search, ShieldCheck, Hourglass } from 'lucide-react';

export const RiwayatPelatihan: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // CATATAN: Halaman ini sebelumnya berada di sisi karyawan dan hanya menampilkan
  // riwayat milik diri sendiri. Sekarang dipindahkan ke sisi Admin/SPV sehingga
  // menampilkan riwayat SEMUA karyawan, lengkap dengan nama & PERNER masing-masing.
  const fetchAllHistory = async () => {
    try {
      setLoading(true);

      // Nama kolom disesuaikan dengan schema asli tabel hasil_pelatihan
      // (nilai_pretest / nilai_posttest, BUKAN nilai_pre_test / nilai_post_test).
      const { data, error } = await supabase
        .from('hasil_pelatihan')
        .select(`
          id_hasil, id_jadwal, nilai_pretest, nilai_posttest, nilai_akhir, status, is_verified,
          data_peserta (perner, nama_peserta),
          jadwal_pelatihan (tanggal_pelatihan, type_pelatihan (nama_pelatihan))
        `)
        .order('id_hasil', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Gagal mengambil riwayat pelatihan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllHistory();
  }, []);

  const filteredHistory = history.filter((row) => {
    if (!search.trim()) return true;
    const keyword = search.trim().toLowerCase();
    const nama = String(row.data_peserta?.nama_peserta || '').toLowerCase();
    const perner = String(row.data_peserta?.perner || '').toLowerCase();
    const pelatihan = String(row.jadwal_pelatihan?.type_pelatihan?.nama_pelatihan || '').toLowerCase();
    return nama.includes(keyword) || perner.includes(keyword) || pelatihan.includes(keyword);
  });

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Riwayat Pelatihan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Rekap riwayat pelatihan seluruh karyawan</p>
        </div>
        <button
          onClick={fetchAllHistory}
          className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-700 border border-sky-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Cari nama, PERNER, atau pelatihan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-sky-50 dark:bg-slate-900 text-xs font-mono border-b border-sky-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase">
              <tr>
                <th className="p-4">Karyawan</th>
                <th className="p-4">Pelatihan</th>
                <th className="p-4 text-center">Pre-Test</th>
                <th className="p-4 text-center">Post-Test</th>
                <th className="p-4 text-center">Nilai Akhir</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-200 dark:divide-slate-700 text-sm text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 dark:text-slate-500 font-mono">Menyusun riwayat kompetensi...</td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    {search ? 'Tidak ada riwayat yang cocok dengan pencarian.' : 'Belum ada riwayat pelatihan tercatat.'}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id_hasil} className="hover:bg-sky-50 dark:hover:bg-slate-750/20 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{row.data_peserta?.nama_peserta || 'Guest'}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-mono">PERNER: {row.data_peserta?.perner ?? '-'}</p>
                    </td>
                    <td className="p-4 font-mono text-sky-400 font-medium text-xs">
                      {row.jadwal_pelatihan?.type_pelatihan?.nama_pelatihan || `Sesi ${row.id_jadwal}`}
                      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">{row.jadwal_pelatihan?.tanggal_pelatihan}</p>
                    </td>
                    <td className="p-4 text-center font-mono">{row.nilai_pretest ?? '-'}</td>
                    <td className="p-4 text-center font-mono">{row.nilai_posttest ?? '-'}</td>
                    <td className="p-4 text-center font-mono font-bold">{row.nilai_akhir != null ? Number(row.nilai_akhir).toFixed(1) : '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${
                        row.status === 'Lulus'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {row.status || 'Proses'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {row.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          <Hourglass className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
