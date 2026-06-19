import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, Library, Calendar, ShieldAlert, Award } from 'lucide-react';

export const DashboardAdmin: React.FC = () => {
  const [stats, setStats] = useState({
    totalPeserta: 0,
    totalMaster: 0,
    totalJadwal: 0,
    pendingVerify: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        
        // Query Agregasi Data
        const { count: pesertaCount } = await supabase.from('data_peserta').select('*', { count: 'exact', head: true });
        const { count: masterCount } = await supabase.from('type_pelatihan').select('*', { count: 'exact', head: true });
        const { count: jadwalCount } = await supabase.from('jadwal_pelatihan').select('*', { count: 'exact', head: true });
        const { count: pendingCount } = await supabase.from('hasil_pelatihan').select('*', { count: 'exact', head: true }).eq('is_verified', false);

        setStats({
          totalPeserta: pesertaCount || 0,
          totalMaster: masterCount || 0,
          totalJadwal: jadwalCount || 0,
          pendingVerify: pendingCount || 0
        });
      } catch (err) {
        console.error('Gagal memuat statistik dasbor admin:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="p-6 space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold text-sky-400">Dashboard Admin</h1>
        <p className="text-sm text-slate-400">Ringkasan metrik operasional dan data analitik Diklat Trainify</p>
      </div>

      {loading ? (
        <div className="text-xs font-mono text-slate-500 animate-pulse">Mengkalkulasi parameter sistem...</div>
      ) : (
        <>
          {/* Grid Metrik Angka Utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400"><Users className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase">Total Karyawan</p>
                <h3 className="text-2xl font-bold font-mono text-slate-100">{stats.totalPeserta}</h3>
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><Library className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase">Silabus Master</p>
                <h3 className="text-2xl font-bold font-mono text-slate-100">{stats.totalMaster}</h3>
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400"><Calendar className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase">Plotting Jadwal</p>
                <h3 className="text-2xl font-bold font-mono text-slate-100">{stats.totalJadwal}</h3>
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><ShieldAlert className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase">Unverified Score</p>
                <h3 className="text-2xl font-bold font-mono text-amber-400">{stats.pendingVerify}</h3>
              </div>
            </div>
          </div>

          {/* Panel Alur Operasional Kerja */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
            <h3 className="font-bold text-xs uppercase font-mono text-sky-400 tracking-wider">Panduan Cepat Prosedur Diklat</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/50 space-y-1">
                <span className="text-sky-400 font-bold block mb-1">01. Master & Jadwal</span>
                <p className="text-slate-400 leading-relaxed">Daftarkan silabus materi pelatihan di Manajemen Master, lalu plot tanggal pelaksanaan dan assign instruktur melalui menu Jadwal Pelatihan.</p>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/50 space-y-1">
                <span className="text-purple-400 font-bold block mb-1">02. Assignment Karyawan</span>
                <p className="text-slate-400 leading-relaxed">Gunakan ikon kelola peserta di tabel jadwal untuk meng-assign nomor PERNER karyawan ke dalam kelas koordinasi secara real-time.</p>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/50 space-y-1">
                <span className="text-emerald-400 font-bold block mb-1">03. Verifikasi Kelulusan</span>
                <p className="text-slate-400 leading-relaxed">Input pencapaian nilai Pre-Test / Post-Test peserta di halaman Manajemen Penilaian, lalu klik 'Verify' agar sertifikat terbit di sisi user.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};