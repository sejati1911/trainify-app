import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Award, ShieldCheck, Clock } from 'lucide-react';

export const HasilPenilaianUser: React.FC = () => {
  const { user } = useAuth();
  const [verifiedList, setVerifiedList] = useState<any[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVerifiedScores = async () => {
      if (!user?.perner) return;
      try {
        setLoading(true);

        // 1. Dapatkan id_peserta internal dari nomor perner
        const { data: userData } = await supabase
          .from('data_peserta')
          .select('id_peserta')
          .eq('perner', user.perner)
          .maybeSingle();

        if (!userData?.id_peserta) return;

        // 2. Ambil data nilai yang berstatus SUDAH DIVERIFIKASI (is_verified = true)
        const { data: scoresData, error } = await supabase
          .from('hasil_pelatihan')
          .select('*')
          .eq('id_peserta', userData.id_peserta)
          .eq('is_verified', true);

        if (error) throw error;
        
        const validScores = scoresData || [];
        setVerifiedList(validScores);

        // 3. Ambil total durasi jam pelajaran untuk menghitung akumulasi kompetensi karyawan
        if (validScores.length > 0) {
          const listJadwalIds = validScores.map(v => v.id_jadwal);
          const { data: schedules } = await supabase
            .from('jadwal_pelatihan')
            .select('durasi')
            .in('id_jadwal', listJadwalIds);

          // Hitung total jam dari format TIME (HH:MM:SS)
          let hoursAcc = 0;
          schedules?.forEach(s => {
            if (s.durasi) {
              const parts = s.durasi.split(':');
              hoursAcc += parseInt(parts[0], 10) || 0;
            }
          });
          setTotalHours(hoursAcc);
        }

      } catch (err) {
        console.error('Gagal memuat sertifikasi user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVerifiedScores();
  }, [user]);

  if (loading) return <div className="p-6 text-slate-400 font-mono text-sm">Menyelaraskan sertifikat kompetensi...</div>;

  return (
    <div className="p-6 space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold text-sky-400">Kelulusan & Sertifikasi</h1>
        <p className="text-sm text-slate-400">Portofolio kompetensi dan pencapaian jam pelatihan formal Anda</p>
      </div>

      {/* Rangkuman Metrik Kompetensi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400"><Award className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400 font-mono uppercase">Sertifikat Rilis</p>
            <h3 className="text-2xl font-bold text-slate-100">{verifiedList.filter(v => v.status === 'Lulus').length} Kelas</h3>
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><Clock className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400 font-mono uppercase">Total Akumulasi Diklat</p>
            <h3 className="text-2xl font-bold text-emerald-400">{totalHours} / 10 Jam <span className="text-xs text-slate-500 font-normal">(Target Tahunan)</span></h3>
          </div>
        </div>
      </div>

      {/* Grid Kartu Kelulusan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {verifiedList.length === 0 ? (
          <p className="text-slate-500 text-sm col-span-full">Belum ada transkrip kelulusan yang diverifikasi oleh admin diklat.</p>
        ) : (
          verifiedList.map((cert) => (
            <div key={cert.id_hasil} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg hover:border-slate-600 transition-all flex flex-col justify-between">
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 text-slate-400 rounded">ID VERIFY: {cert.id_hasil}</span>
                  <ShieldCheck className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h4 className="font-mono text-xs text-slate-400">KODE SESI</h4>
                  <p className="text-base font-bold text-slate-100">{cert.id_jadwal}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/50 text-center font-mono">
                  <div>
                    <p className="text-[10px] text-slate-500">PRE-TEST</p>
                    <p className="text-sm font-bold text-slate-300">{cert.nilai_pre_test ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">POST-TEST</p>
                    <p className="text-sm font-bold text-sky-400">{cert.nilai_post_test ?? '-'}</p>
                  </div>
                </div>
              </div>
              <div className={`p-3 text-center text-xs font-bold font-mono border-t ${
                cert.status === 'Lulus' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {cert.status === 'Lulus' ? '✓ VERIFIED: GRADUATED' : '✕ VERIFIED: FAILED'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};