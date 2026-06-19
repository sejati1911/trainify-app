import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Calendar, CheckCircle2, RefreshCw } from 'lucide-react';

export const JadwalUser: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [registeredIds, setRegisteredIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJadwalAndRegistrations = async () => {
    if (!user?.perner) return;
    try {
      setLoading(true);

// Ubah kueri select pada JadwalUser.tsx menjadi seperti ini:
const { data: scheduleData, error: schedError } = await supabase
  .from('jadwal_pelatihan')
  .select(`
    *,
    type_pelatihan (nama_pelatihan)
  `)
  .order('tanggal_pelatihan', { ascending: true });

      if (schedError) throw schedError;

      const { data: regData, error: regError } = await supabase
        .from('peserta_jadwal')
        .select('id_jadwal')
        .eq('perner', user.perner);

      if (regError) throw regError;

      setSchedules(scheduleData || []);
      // Pastikan di-map ke Number karena id_jadwal sekarang bertipe smallint (angka)
      setRegisteredIds(regData?.map(r => Number(r.id_jadwal)) || []);
    } catch (err) {
      console.error('Gagal memuat jadwal user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (idJadwal: number) => {
    if (!user?.perner) return;
    try {
      // 1. Dapatkan id_peserta internal dari tabel data_peserta berdasarkan nomor perner user login
      const { data: pData, error: pError } = await supabase
        .from('data_peserta')
        .select('id_peserta')
        .eq('perner', user.perner)
        .maybeSingle();

      if (pError) throw pError;
      if (!pData) {
        alert("PERNER Anda belum terdaftar di Data Induk Peserta! Hubungi Admin.");
        return;
      }

      // 2. Daftarkan ke peserta_jadwal
      const { error: regError } = await supabase
        .from('peserta_jadwal')
        .insert([{ perner: user.perner, id_jadwal: idJadwal }]);

      if (regError) throw regError;

      // 3. Masukkan record evaluasi ke hasil_pelatihan menggunakan id_peserta internal
      await supabase
        .from('hasil_pelatihan')
        .insert([{ 
          id_jadwal: idJadwal, 
          id_peserta: pData.id_peserta, 
          status: 'Tidak Lulus', 
          is_verified: false 
        }]);

      alert('Berhasil mendaftar kelas pelatihan!');
      fetchJadwalAndRegistrations();
    } catch (err: any) {
      alert(`Gagal mendaftar: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchJadwalAndRegistrations();
  }, [user]);

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Jadwal Pelatihan Tersedia</h1>
          <p className="text-sm text-slate-400">Pilih sesi aktif untuk memenuhi ambang batas 10 jam kompetensi tahunan Anda</p>
        </div>
        <button onClick={fetchJadwalAndRegistrations} className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm font-mono text-slate-500">Sinkronisasi jadwal...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {schedules.length === 0 ? (
            <p className="text-slate-500 text-sm col-span-full">Belum ada kelas pelatihan dibuka untuk saat ini.</p>
          ) : (
            schedules.map((item) => {
              const isRegistered = registeredIds.includes(Number(item.id_jadwal));
              return (
                <div key={item.id_jadwal} className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-600 transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-900 rounded text-sky-400 font-bold">KODE: {item.id_jadwal}</span>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Aktif</span>
                    </div>
                    <h3 className="font-bold text-base text-slate-100">{item.type_pelatihan?.nama_pelatihan}</h3>
                    <div className="space-y-1 text-xs text-slate-400 font-mono">
                      <p>🗓️ Tanggal: {item.tanggal_pelatihan}</p>
                      <p>⏱️ Jam: {item.waktu_mulai?.slice(0,5)} - {item.waktu_selesai?.slice(0,5)} WIB</p>
                    </div>
                  </div>

                  {isRegistered ? (
                    <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-2 rounded-lg text-xs font-semibold text-center font-mono">
                      ✓ Sudah Terdaftar
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRegister(item.id_jadwal)}
                      className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Calendar className="w-4 h-4" /> <span>Ikuti Pelatihan</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};