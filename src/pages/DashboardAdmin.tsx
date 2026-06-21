import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Users, Library, Calendar, ShieldAlert, PieChart, BarChart2, CheckCircle2, } from 'lucide-react';

export const DashboardAdmin: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // State Utama Statistik Sesuai Target SRS
  const [stats, setStats] = useState({
    totalPeserta: 0,
    totalMaster: 0,
    totalJadwal: 0,
    pendingVerify: 0,
    maleCount: 0,
    femaleCount: 0,
    kpiAchieved: 0, // Karyawan >= 10 jam
    kpiFailed: 0    // Karyawan < 10 jam
  });

  // State Distribusi Kategori Pelatihan
  const [categoryDistribution, setCategoryDistribution] = useState({
    core: 0,
    generic: 0,
    specific: 0,
    supplementary: 0
  });

  // State Tabel Progres Pelatihan Karyawan
  const [employeeProgress, setEmployeeProgress] = useState<any[]>([]);

  // Deteksi Peran Pengguna
  const currentRole = user && user.role ? String(user.role).toLowerCase() : 'user';
  const isSpv = currentRole === 'spv';

  // Helper untuk konversi string durasi 'HH:MM:SS' menjadi jam desimal (number)
  const parseDurasiToHours = (durasiStr: string | null): number => {
    if (!durasiStr) return 0;
    const parts = durasiStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours + (minutes / 60);
  };

  useEffect(() => {
    const fetchDashboardAnalytics = async () => {
      try {
        setLoading(true);

        // 1. Ambil Semua Data Induk Peserta untuk Olah Demografi & Jam Kerja
        const { data: pesertaData } = await supabase.from('data_peserta').select('*');
        const listPeserta = pesertaData || [];
        
        let male = 0;
        let female = 0;
        listPeserta.forEach(p => {
          if (p.gender === 'Laki-laki') male++;
          else if (p.gender === 'Perempuan') female++;
        });

        // 2. Ambil Semua Hasil Pelatihan Terverifikasi beserta Durasi Jadwal & Kategori Pelatihan
        const { data: hasilData } = await supabase.from('hasil_pelatihan').select(`
          id_peserta, status, is_verified, nilai_akhir,
          jadwal_pelatihan (
            durasi,
            type_pelatihan (kategori_pelatihan)
          )
        `);
        const listHasil = hasilData || [];

        // 3. Hitung Distribusi Rumpun Kategori Pelatihan Berdasarkan Kelas yang Diikuti
        let coreCount = 0;
        let genericCount = 0;
        let specificCount = 0;
        let suppCount = 0;

        // Peta Akumulasi Jam per Karyawan
        const hoursMap: { [key: number]: number } = {};
        listPeserta.forEach(p => { hoursMap[p.id_peserta] = 0; });

        listHasil.forEach((h: any) => {
          const kategori = h.jadwal_pelatihan?.type_pelatihan?.kategori_pelatihan?.toLowerCase();
          if (kategori === 'core') coreCount++;
          else if (kategori === 'generic') genericCount++;
          else if (kategori === 'specific') specificCount++;
          else if (kategori === 'supplementary') suppCount++;

          // Akumulasi jam kerja jika status LULUS dan VERIFIED
          if (h.status === 'Lulus' && h.is_verified) {
            const jam = parseDurasiToHours(h.jadwal_pelatihan?.durasi);
            if (hoursMap[h.id_peserta] !== undefined) {
              hoursMap[h.id_peserta] += jam;
            }
          }
        });

        // 4. Hitung Kepatuhan Aturan KPI (Minimal 10 Jam per Tahun)
        let achieved = 0;
        let failed = 0;
        const progressTable: any[] = [];

        listPeserta.forEach(p => {
          const totalJam = hoursMap[p.id_peserta] || 0;
          if (totalJam >= 10) achieved++;
          else failed++;

          progressTable.push({
            id_peserta: p.id_peserta,
            perner: p.perner,
            nama_peserta: p.nama_peserta,
            job_position: p.job_position,
            total_jam: totalJam
          });
        });

        // 5. Query Counts untuk Informasi Summary Card Atas
        const { count: masterCount } = await supabase.from('type_pelatihan').select('*', { count: 'exact', head: true });
        const { count: jadwalCount } = await supabase.from('jadwal_pelatihan').select('*', { count: 'exact', head: true });
        const { count: pendingCount } = await supabase.from('hasil_pelatihan').select('*', { count: 'exact', head: true }).eq('is_verified', false);

        setStats({
          totalPeserta: listPeserta.length,
          totalMaster: masterCount || 0,
          totalJadwal: jadwalCount || 0,
          pendingVerify: pendingCount || 0,
          maleCount: male,
          femaleCount: female,
          kpiAchieved: achieved,
          kpiFailed: failed
        });

        setCategoryDistribution({
          core: coreCount,
          generic: genericCount,
          specific: specificCount,
          supplementary: suppCount
        });

        setEmployeeProgress(progressTable.sort((a, b) => b.total_jam - a.total_jam));

      } catch (err) {
        console.error('Gagal memuat analitik dasbor:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardAnalytics();
  }, []);

  // Hitung persentase untuk visualisasi chart CSS
  const totalKategori = categoryDistribution.core + categoryDistribution.generic + categoryDistribution.specific + categoryDistribution.supplementary || 1;
  const pctCore = (categoryDistribution.core / totalKategori) * 100;
  const pctGeneric = (categoryDistribution.generic / totalKategori) * 100;
  const pctSpecific = (categoryDistribution.specific / totalKategori) * 100;
  const pctSupp = (categoryDistribution.supplementary / totalKategori) * 100;

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-white">
      {/* HEADER UTAMA */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">
            {isSpv ? 'Dashboard Supervisor' : 'Dashboard Master Admin'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isSpv ? 'Hak Monitoring: Ringkasan pemenuhan KPI 10 jam pelatihan karyawan.' : 'Ringkasan pemenuhan KPI 10 jam pelatihan karyawan'}
          </p>
        </div>
        {isSpv && (
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
            Mode Monitoring SPV
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-xs font-mono text-slate-400 dark:text-slate-500 animate-pulse">Mengkalkulasi parameter parameter analitik sistem...</div>
      ) : (
        <>
          {/* ================= BLOK 1: SUMMARY METRICS CARD ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400"><Users className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">Total Karyawan</p>
                <h3 className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{stats.totalPeserta}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><Library className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">Data Master</p>
                <h3 className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{stats.totalMaster}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400"><Calendar className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">Sesi Pelatihan</p>
                <h3 className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{stats.totalJadwal}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><ShieldAlert className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">Belum Diverifikasi</p>
                <h3 className="text-2xl font-bold font-mono text-amber-400">{stats.pendingVerify}</h3>
              </div>
            </div>
          </div>

          {/* ================= BLOK 2: GRAFIK DEMOGRAFI & COMPLIANCE KPI ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CARD KEPATUHAN TARGET KPI (10 JAM / TAHUN) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center space-x-2 text-sky-400">
                <CheckCircle2 className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider">Pemenuhan KPI (10 Jam/Tahun)</h4>
              </div>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-emerald-400">Target Terpenuhi ({stats.kpiAchieved})</span>
                    <span className="text-slate-500 dark:text-slate-400">{((stats.kpiAchieved / (stats.totalPeserta || 1)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(stats.kpiAchieved / (stats.totalPeserta || 1)) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-red-400">Belum Terpenuhi ({stats.kpiFailed})</span>
                    <span className="text-slate-500 dark:text-slate-400">{((stats.kpiFailed / (stats.totalPeserta || 1)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(stats.kpiFailed / (stats.totalPeserta || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD RASIO GENDER KARYAWAN */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center space-x-2 text-sky-400">
                <PieChart className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider">Komposisi Gender Karyawan</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-center font-mono">
                <div className="p-2.5 bg-sky-50/70 dark:bg-slate-900/50 rounded-lg border border-sky-200/60 dark:border-slate-700/40">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Laki-Laki</p>
                  <p className="text-lg font-bold text-indigo-400 mt-0.5">{stats.maleCount}</p>
                </div>
                <div className="p-2.5 bg-sky-50/70 dark:bg-slate-900/50 rounded-lg border border-sky-200/60 dark:border-slate-700/40">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Perempuan</p>
                  <p className="text-lg font-bold text-pink-400 mt-0.5">{stats.femaleCount}</p>
                </div>
              </div>
            </div>

            {/* CARD DISTRIBUSI RUMPUN KATEGORI PELATHAN */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-3.5">
              <div className="flex items-center space-x-2 text-sky-400">
                <BarChart2 className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider">Distribusi Kategori Kelas</h4>
              </div>
              <div className="space-y-2 pt-1 font-mono text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5"><span>Core Training ({categoryDistribution.core})</span></div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden"><div className="bg-sky-500 h-full" style={{ width: `${pctCore}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5"><span>Generic Training ({categoryDistribution.generic})</span></div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden"><div className="bg-purple-500 h-full" style={{ width: `${pctGeneric}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5"><span>Specific Training ({categoryDistribution.specific})</span></div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{ width: `${pctSpecific}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5"><span>Supplementary ({categoryDistribution.supplementary})</span></div>
                  <div className="w-full bg-sky-50 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden"><div className="bg-teal-500 h-full" style={{ width: `${pctSupp}%` }}></div></div>
                </div>
              </div>
            </div>

          </div>

          {/* ================= BLOK 3: TABEL PROGRESS BAR JAM DIKLAT KARYAWAN ================= */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-sky-50 dark:bg-slate-900 border-b border-sky-200 dark:border-slate-700">
              <h3 className="text-xs font-bold text-sky-400 uppercase font-mono tracking-wider">Progres Capaian Jam Pelatihan Karyawan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sky-50 dark:bg-slate-900 border-b border-sky-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">PERNER</th>
                    <th className="p-3">Nama Karyawan</th>
                    <th className="p-3">Posisi Jabatan</th>
                    <th className="p-3">Total Jam Valid</th>
                    <th className="p-3 w-1/4">Status Target (Min. 10 Jam)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                  {employeeProgress.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center font-mono text-slate-400 dark:text-slate-500">Tidak ada rekam jejak progres karyawan ditemukan.</td></tr>
                  ) : (
                    employeeProgress.map(emp => {
                      // Hitung rasio terhadap target 10 jam (maksimal batas visual bar 100%)
                      const rasioKpi = Math.min((emp.total_jam / 10) * 100, 100);
                      return (
                        <tr key={emp.id_peserta} className="hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="p-3 font-mono text-sky-400 font-medium">{emp.perner}</td>
                          <td className="p-3 font-semibold">{emp.nama_peserta}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{emp.job_position}</td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{emp.total_jam.toFixed(1)} Jam</td>
                          <td className="p-3">
                            <div className="space-y-1.5">
                              <div className="w-full bg-sky-50 dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-sky-200/60 dark:border-slate-700/30">
                                <div 
                                  className={`h-full transition-all duration-300 ${emp.total_jam >= 10 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                                  style={{ width: `${rasioKpi}%` }}
                                ></div>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${emp.total_jam >= 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {emp.total_jam >= 10 ? 'Compliant' : 'Incomplete'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL ALUR OPERASIONAL KERJA (Hanya Tampil Jika BUKAN SPV) */}
          {!isSpv && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-3">
              <h3 className="font-bold text-xs uppercase font-mono text-sky-400 tracking-wider">Panduan Prosedur Modul Master Admin</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] font-mono">
                <div className="p-3 bg-sky-50/70 dark:bg-slate-900/40 rounded-lg border border-sky-200/60 dark:border-slate-700/50"><span className="text-sky-400 font-bold block mb-0.5">01. Rilis Kelas</span><p className="text-slate-500 dark:text-slate-400 leading-relaxed">Daftarkan materi pelatihan baru di Manajemen Master, lalu tetapkan jadwal dan trainer di Jadwal Pelatihan.</p></div>
                <div className="p-3 bg-sky-50/70 dark:bg-slate-900/40 rounded-lg border border-sky-200/60 dark:border-slate-700/50"><span className="text-purple-400 font-bold block mb-0.5">02. Plotting Staff</span><p className="text-slate-500 dark:text-slate-400 leading-relaxed">Gunakan ikon tombol "Kelola Peserta" di daftar tabel jadwal untuk melakukan entri plotting karyawan.</p></div>
                <div className="p-3 bg-sky-50/70 dark:bg-slate-900/40 rounded-lg border border-sky-200/60 dark:border-slate-700/50"><span className="text-emerald-400 font-bold block mb-0.5">03. Verifikasi Nilai</span><p className="text-slate-500 dark:text-slate-400 leading-relaxed">Masukkan akumulasi skor ujian peserta di Manajemen Penilaian, lalu klik "Verify" untuk menutup pelatihan.</p></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};