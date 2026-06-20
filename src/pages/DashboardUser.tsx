import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { BookOpen, GraduationCap, CheckCircle, Clock, BarChart4 } from 'lucide-react';

export const DashboardUser: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalDiikuti: 0,
    lulusCount: 0,
    totalJamValid: 0
  });

  const [categoryStats, setCategoryStats] = useState({
    core: 0,
    generic: 0,
    specific: 0,
    supplementary: 0
  });

  // Helper untuk mengubah string durasi 'HH:MM:SS' menjadi nilai desimal jam
  const parseDurasiToHours = (durasiStr: string | null): number => {
    if (!durasiStr) return 0;
    const parts = durasiStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours + (minutes / 60);
  };

  useEffect(() => {
    const fetchUserStatsAndAnalytics = async () => {
      if (!user?.perner) return;
      try {
        setLoading(true);

        // 1. Dapatkan id_peserta internal database
        const { data: pData } = await supabase
          .from('data_peserta')
          .select('id_peserta')
          .eq('perner', user.perner)
          .maybeSingle();

        if (pData?.id_peserta) {
          // 2. Hitung total kelas terdaftar di peserta_jadwal
          const { count: countJadwal } = await supabase
            .from('peserta_jadwal')
            .select('*', { count: 'exact', head: true })
            .eq('perner', user.perner);

          // 3. Ambil seluruh data hasil pelatihan untuk kalkulasi jam & rumpun kategori
          const { data: hasilData } = await supabase
            .from('hasil_pelatihan')
            .select(`
              status, is_verified,
              jadwal_pelatihan (
                durasi,
                type_pelatihan (kategori_pelatihan)
              )
            `)
            .eq('id_peserta', pData.id_peserta);

          const listHasil = hasilData || [];
          
          let lulusCount = 0;
          let akumulasiJam = 0;
          let core = 0, generic = 0, specific = 0, supp = 0;

          listHasil.forEach((h: any) => {
            const kategori = h.jadwal_pelatihan?.type_pelatihan?.kategori_pelatihan?.toLowerCase();
            
            // Hitung distribusi kelas yang terdaftar
            if (kategori === 'core') core++;
            else if (kategori === 'generic') generic++;
            else if (kategori === 'specific') specific++;
            else if (kategori === 'supplementary') supp++;

            // Akumulasi jam valid hanya dari kelas yang Lulus & Terverifikasi Admin
            if (h.status === 'Lulus' && h.is_verified) {
              lulusCount++;
              akumulasiJam += parseDurasiToHours(h.jadwal_pelatihan?.durasi);
            }
          });

          setUserStats({
            totalDiikuti: countJadwal || 0,
            lulusCount: lulusCount,
            totalJamValid: akumulasiJam
          });

          setCategoryStats({
            core,
            generic,
            specific,
            supplementary: supp
          });
        }
      } catch (err) {
        console.error('Gagal memuat analitik dasbor user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStatsAndAnalytics();
  }, [user]);

  // Hitung persentase pemenuhan KPI target wajib tahunan perusahaan (Batas minimal 10 Jam)
  const persenKpi = Math.min((userStats.totalJamValid / 10) * 100, 100);

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-white">
      {/* Welcome Card Banner */}
      <div className="bg-gradient-to-r from-sky-50 to-white dark:from-slate-900 dark:to-slate-900 p-6 rounded-xl border border-sky-100 dark:border-slate-800 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Selamat Datang Kembali, <span className="text-sky-400 font-mono font-bold">{user?.username}</span>!
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
          Nomor PERNER Anda: <span className="text-sky-400 font-semibold">{user?.perner || '-'}</span>
        </p>
      </div>

      {loading ? (
        <div className="text-xs font-mono text-slate-400 dark:text-slate-500 animate-pulse">Menyelaraskan metrik capaian pelatihan Anda...</div>
      ) : (
        <>
          {/* ================= CARD METRIK KINERJA UTAMA ================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400"><BookOpen className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">Pelatihan Diikuti</p>
                <h3 className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{userStats.totalDiikuti}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><GraduationCap className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">Pelatihan Lulus Valid</p>
                <h3 className="text-2xl font-bold font-mono text-emerald-400">{userStats.lulusCount}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><Clock className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">Total Waktu Pelatihan</p>
                <h3 className="text-2xl font-bold font-mono text-amber-400">{userStats.totalJamValid.toFixed(1)} Jam</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ================= PANEL TARGET PROGRESS KPI (10 JAM WAJIB) ================= */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-4 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-sky-400">
                  <Clock className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider">Pemenuhan Target Jam Pelatihan Tahunan</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
                  Target pemenuhan pelatihan Anda adalah minimal 10 jam pelatihan terverifikasi setiap periode tahun berjalan.
                </p>
              </div>

              <div className="space-y-2 bg-sky-50/60 dark:bg-slate-950/40 p-4 rounded-xl border border-sky-100 dark:border-slate-900/60">
                <div className="flex justify-between items-end font-mono text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Progres Akumulasi Waktu:</span>
                  <span className={`font-bold ${userStats.totalJamValid >= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {userStats.totalJamValid.toFixed(1)} / 10.0 Jam ({persenKpi.toFixed(0)}%)
                  </span>
                </div>
                
                <div className="w-full bg-sky-50 dark:bg-slate-900 h-3 rounded-full overflow-hidden border border-sky-100 dark:border-slate-800">
                  <div 
                    className={`h-full transition-all duration-500 ${userStats.totalJamValid >= 10 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
                    style={{ width: `${persenKpi}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${userStats.totalJamValid >= 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {userStats.totalJamValid >= 10 ? '✓ Target KPI Terpenuhi (Compliant)' : '⚠️ Belum Memenuhi Target Wajib'}
                  </span>
                </div>
              </div>
            </div>

            {/* ================= PANEL DISTRIBUSI KATEGORI PERSONAL ================= */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-3.5">
              <div className="flex items-center space-x-2 text-sky-400">
                <BarChart4 className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider">Kategori Pelatihan</h4>
              </div>
              
              <div className="space-y-2.5 font-mono text-[11px] pt-1">
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5"><span>Core</span><span className="text-slate-400 dark:text-slate-500">{categoryStats.core} Kelas</span></div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-1.5 rounded-full"><div className="bg-sky-500 h-full rounded-full" style={{ width: `${categoryStats.core ? '100%' : '0%'}` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5"><span>Generic</span><span className="text-slate-400 dark:text-slate-500">{categoryStats.generic} Kelas</span></div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-1.5 rounded-full"><div className="bg-purple-500 h-full rounded-full" style={{ width: `${categoryStats.generic ? '100%' : '0%'}` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5"><span>Specific</span><span className="text-slate-400 dark:text-slate-500">{categoryStats.specific} Kelas</span></div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-1.5 rounded-full"><div className="bg-amber-500 h-full rounded-full" style={{ width: `${categoryStats.specific ? '100%' : '0%'}` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5"><span>Supplementary</span><span className="text-slate-400 dark:text-slate-500">{categoryStats.supplementary} Kelas</span></div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-1.5 rounded-full"><div className="bg-teal-500 h-full rounded-full" style={{ width: `${categoryStats.supplementary ? '100%' : '0%'}` }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Informasi Alur Karyawan */}
      <div className="bg-sky-50/60 dark:bg-slate-800/60 p-5 rounded-xl border border-sky-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-mono leading-relaxed space-y-2">
        <p className="font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider flex items-center space-x-1">
          <CheckCircle className="w-3.5 h-3.5 text-sky-400" /> <span>Catatan Prosedur Karyawan</span>
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1">
          <li>Lihat menu <span className="text-sky-400">Jadwal Pelatihan</span> untuk mendaftar/melihat detail tanggal pelatihan aktif.</li>
          <li>Menu <span className="text-sky-400">Riwayat Pelatihan</span> menampilkan kelas yang sedang Anda tempuh saat ini.</li>
          <li>Nilai ujian dan status kelulusan dapat dicek pada halaman <span className="text-sky-400">Hasil Penilaian</span> </li>
        </ul>
      </div>
    </div>
  );
};