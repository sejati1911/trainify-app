import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { RefreshCw } from 'lucide-react';

export const RiwayatPelatihan: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserHistory = async () => {
    if (!user?.perner) return;
    try {
      setLoading(true);

      // LANGKAH 1: Cari semua id_jadwal yang didaftarkan oleh PERNER ini di tabel peserta_jadwal
      // (Ini adalah tabel jembatan yang pasti memiliki kolom perner)
      const { data: regData, error: regError } = await supabase
        .from('peserta_jadwal')
        .select('id_jadwal')
        .eq('perner', user.perner);

      if (regError) throw regError;

      if (!regData || regData.length === 0) {
        setHistory([]);
        return;
      }

      // Ambil daftar id_jadwal menjadi array string/number
      const listJadwalId = regData.map(r => r.id_jadwal);

      // LANGKAH 2: Tarik data dari hasil_pelatihan yang id_jadwal-nya ada di dalam listJadwalId
      // Serta cocokkan dengan data perner jika kolomnya ada, atau cukup berdasarkan id_jadwal kelas tersebut.
      const { data: hasilData, error: hasilError } = await supabase
        .from('hasil_pelatihan')
        .select('*')
        .in('id_jadwal', listJadwalId)
        .order('id_hasil', { ascending: false });

      if (hasilError) throw hasilError;

      // Filter di sisi client untuk memastikan data aman jika hasil_pelatihan menampung banyak user
      // Jika hasil_pelatihan memiliki kolom perner, kita filter. Jika tidak, data hasil filter IN sudah cukup.
      setHistory(hasilData || []);

    } catch (err) {
      console.error('Gagal mengambil riwayat pelatihan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserHistory();
  }, [user]);

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Riwayat Pelatihan</h1>
          <p className="text-sm text-slate-400">Daftar riwayat pelatihan Anda</p>
        </div>
        <button 
          onClick={fetchUserHistory} 
          className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-850 text-xs font-mono border-b border-slate-700 text-slate-400 uppercase">
              <tr>
                <th className="p-4">ID Log</th>
                <th className="p-4">Kode Sesi</th>
                <th className="p-4 text-center">Pre-Test</th>
                <th className="p-4 text-center">Post-Test</th>
                <th className="p-4 text-center">Status Kelulusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500 font-mono">Menyusun riwayat kompetensi...</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">Anda belum pernah terdaftar di jadwal pelatihan manapun.</td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id_hasil} className="hover:bg-slate-750/20 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500">{row.id_hasil}</td>
                    <td className="p-4 font-mono text-sky-400 font-medium">{row.id_jadwal}</td>
                    <td className="p-4 text-center font-mono">{row.nilai_pre_test ?? '-'}</td>
                    <td className="p-4 text-center font-mono">{row.nilai_post_test ?? '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${
                        row.status === 'Lulus' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {row.status || 'Proses'}
                      </span>
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