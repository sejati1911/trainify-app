import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { BookOpen, GraduationCap, CheckCircle } from 'lucide-react';

export const DashboardUser: React.FC = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState({
    totalDiikuti: 0,
    lulusCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user?.perner) return;
      try {
        setLoading(true);

        // 1. Dapatkan id_peserta internal
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

          // 3. Hitung kelas yang sudah diverifikasi 'Lulus'
          const { count: countLulus } = await supabase
            .from('hasil_pelatihan')
            .select('*', { count: 'exact', head: true })
            .eq('id_peserta', pData.id_peserta)
            .eq('status', 'Lulus')
            .eq('is_verified', true);

          setUserStats({
            totalDiikuti: countJadwal || 0,
            lulusCount: countLulus || 0
          });
        }
      } catch (err) {
        console.error('Gagal memuat statistik user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user]);

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Welcome Card Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-850 p-6 rounded-xl border border-slate-700/80 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-100">
          Selamat Datang Kembali, <span className="text-sky-400 font-mono font-medium">{user?.username}</span>!
        </h1>
        <p className="text-sm text-slate-400 mt-1 font-sans">
          Nomor PERNER Kedinasan Anda: <span className="text-slate-300 font-mono font-semibold">{user?.perner || '-'}</span>
        </p>
      </div>

      {loading ? (
        <div className="text-xs font-mono text-slate-500 animate-pulse">Sinkronisasi status kompetensi Anda...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Kartu Status Kelas */}
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center space-x-4">
            <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400"><BookOpen className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-400 font-mono uppercase">Total Kelas Diikuti</p>
              <h3 className="text-2xl font-bold font-mono text-slate-100">{userStats.totalDiikuti}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Terdaftar di manifes jadwal diklat</p>
            </div>
          </div>

          {/* Kartu Status Sertifikat Kelulusan */}
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><GraduationCap className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-400 font-mono uppercase">Sertifikat Kompetensi</p>
              <h3 className="text-2xl font-bold font-mono text-emerald-400">{userStats.lulusCount}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Telah diverifikasi oleh Admin Diklat</p>
            </div>
          </div>
        </div>
      )}

      {/* Informasi Alur Karyawan */}
      <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 text-xs text-slate-400 font-mono leading-relaxed space-y-2">
        <p className="font-bold text-slate-300 uppercase text-[10px] tracking-wider flex items-center space-x-1">
          <CheckCircle className="w-3.5 h-3.5 text-sky-400" /> <span>Catatan Prosedur Karyawan</span>
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
          <li>Lihat menu <span className="text-sky-400">Jadwal User</span> untuk mendaftar/melihat detail tanggal pelatihan aktif.</li>
          <li>Menu <span className="text-sky-400">Riwayat Pelatihan</span> menampilkan kelas yang sedang Anda tempuh saat ini.</li>
          <li>Transkrip nilai ujian dan sertifikat kelulusan sah resmi akan diterbitkan di halaman <span className="text-sky-400">Hasil Penilaian User</span> setelah Admin memberikan verifikasi berkas.</li>
        </ul>
      </div>
    </div>
  );
};