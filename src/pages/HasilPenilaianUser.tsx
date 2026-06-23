import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Award, ShieldCheck, Clock, RefreshCw, Hourglass, PlusCircle, X } from 'lucide-react';

export const HasilPenilaianUser: React.FC = () => {
  const { user } = useAuth();
  const [allScores, setAllScores] = useState<any[]>([]); // semua nilai milik user (verified + belum)
  const [registeredSchedules, setRegisteredSchedules] = useState<any[]>([]); // jadwal yang sudah diikuti
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [idPesertaInternal, setIdPesertaInternal] = useState<number | null>(null);

  // State Form Input Mandiri
  const [formOpen, setFormOpen] = useState(false);
  const [idJadwalInput, setIdJadwalInput] = useState('');
  const [nilaiPre, setNilaiPre] = useState('');
  const [nilaiPost, setNilaiPost] = useState('');

  const hitungGrade = (nilai: number): string => {
    if (nilai >= 90) return 'A';
    if (nilai >= 80) return 'B';
    if (nilai >= 70) return 'C';
    if (nilai >= 60) return 'D';
    return 'E';
  };

  const fetchData = async () => {
    if (!user?.perner) return;
    try {
      setLoading(true);

      // 1. Dapatkan id_peserta internal dari nomor perner
      const { data: userData } = await supabase
        .from('data_peserta')
        .select('id_peserta')
        .eq('perner', user.perner)
        .maybeSingle();

      if (!userData?.id_peserta) {
        setLoading(false);
        return;
      }
      setIdPesertaInternal(userData.id_peserta);

      // 2. Ambil SEMUA nilai milik peserta ini (verified maupun belum), kolom sesuai schema asli
      const { data: scoresData, error } = await supabase
        .from('hasil_pelatihan')
        .select(`
          id_hasil, id_jadwal, nilai_pretest, nilai_posttest, nilai_akhir, status, is_verified,
          jadwal_pelatihan (tanggal_pelatihan, type_pelatihan (nama_pelatihan))
        `)
        .eq('id_peserta', userData.id_peserta)
        .order('id_hasil', { ascending: false });

      if (error) throw error;
      const scores = scoresData || [];
      setAllScores(scores);

      // 3. Ambil daftar jadwal yang sudah diikuti peserta (dari peserta_jadwal), untuk pilihan form input mandiri
      const { data: regData } = await supabase
        .from('peserta_jadwal')
        .select('id_jadwal')
        .eq('perner', user.perner);

      const regIds = (regData || []).map(r => Number(r.id_jadwal));
      if (regIds.length > 0) {
        const { data: jadwalData } = await supabase
          .from('jadwal_pelatihan')
          .select('id_jadwal, tanggal_pelatihan, type_pelatihan (nama_pelatihan)')
          .in('id_jadwal', regIds);
        setRegisteredSchedules(jadwalData || []);
      } else {
        setRegisteredSchedules([]);
      }

      // 4. Total jam pelatihan dihitung HANYA dari nilai yang sudah diverifikasi admin
      const verifiedScores = scores.filter(s => s.is_verified);
      if (verifiedScores.length > 0) {
        const listJadwalIds = verifiedScores.map(v => v.id_jadwal);
        const { data: schedules } = await supabase
          .from('jadwal_pelatihan')
          .select('durasi')
          .in('id_jadwal', listJadwalIds);

        let hoursAcc = 0;
        schedules?.forEach(s => {
          if (s.durasi) {
            const parts = s.durasi.split(':');
            hoursAcc += parseInt(parts[0], 10) || 0;
          }
        });
        setTotalHours(hoursAcc);
      } else {
        setTotalHours(0);
      }

    } catch (err) {
      console.error('Gagal memuat sertifikasi user:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Jadwal yang sudah diikuti TAPI belum punya record nilai sama sekali -> ditawarkan di form input mandiri
  const jadwalBelumDinilai = registeredSchedules.filter(
    j => !allScores.some(s => Number(s.id_jadwal) === Number(j.id_jadwal))
  );

  const resetForm = () => {
    setIdJadwalInput('');
    setNilaiPre('');
    setNilaiPost('');
    setFormOpen(false);
  };

  const handleSubmitMandiri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idPesertaInternal) return alert('PERNER Anda belum terdaftar di Data Induk Peserta! Hubungi Admin.');
    if (!idJadwalInput) return alert('Pilih sesi pelatihan terlebih dahulu!');
    if (nilaiPost === '') return alert('Nilai Post-Test wajib diisi!');

    const hasPre = nilaiPre !== '';
    const post = Number(nilaiPost);
    const pre = hasPre ? Number(nilaiPre) : null;
    const akhir = hasPre && pre !== null ? (pre + post) / 2 : post;
    const status = akhir >= 60 ? 'Lulus' : 'Tidak Lulus';

    const payload = {
      id_peserta: idPesertaInternal,
      id_jadwal: Number(idJadwalInput),
      nilai_pretest: hasPre ? pre : null,
      kategori_pretest: hasPre && pre !== null ? hitungGrade(pre) : null,
      nilai_posttest: post,
      kategori_posttest: hitungGrade(post),
      nilai_akhir: akhir,
      status: status,
      is_verified: false, // Input mandiri karyawan WAJIB diverifikasi admin sebelum dianggap sah
    };

    try {
      // Jaga-jaga terhadap kondisi balapan (race condition): cek dulu apakah sudah ada record
      // untuk kombinasi peserta + jadwal ini sebelum insert, supaya tidak bentrok unique constraint.
      const { data: existing } = await supabase
        .from('hasil_pelatihan')
        .select('id_hasil')
        .eq('id_peserta', payload.id_peserta)
        .eq('id_jadwal', payload.id_jadwal)
        .maybeSingle();

      if (existing?.id_hasil) {
        alert('Nilai untuk sesi ini sudah pernah diinput sebelumnya.');
        return;
      }

      const { error } = await supabase.from('hasil_pelatihan').insert([payload]);
      if (error) throw error;

      alert('Nilai berhasil disimpan! Menunggu verifikasi dari admin unit Anda.');
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(`Gagal menyimpan nilai: ${err.message}`);
    }
  };

  if (loading) return <div className="p-6 text-slate-500 dark:text-slate-400 font-mono text-sm">Menyelaraskan hasil pelatihan...</div>;

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Hasil Penilaian Pelatihan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Hasil pelatihan dan capaian kepatuhan jam Anda</p>
        </div>
        <div className="flex items-center gap-2">
          {jadwalBelumDinilai.length > 0 && (
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-3 py-2.5 rounded-lg text-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> <span>{formOpen ? 'Tutup Form' : 'Input Nilai Saya'}</span>
            </button>
          )}
          <button onClick={fetchData} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-700 border border-sky-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FORM INPUT NILAI MANDIRI: hanya muncul untuk sesi yang sudah diikuti namun belum punya nilai */}
      {formOpen && (
        <form onSubmit={handleSubmitMandiri} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-3.5">
          <div className="flex justify-between items-center border-b border-sky-200/60 dark:border-slate-700/50 pb-2">
            <h3 className="font-bold text-sky-400 text-xs uppercase font-mono tracking-wider">Input Nilai Mandiri</h3>
            <button type="button" onClick={resetForm} className="text-slate-500 dark:text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-[11px] text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
            Nilai yang Anda input akan berstatus <b>Belum Diverifikasi</b> sampai dikonfirmasi oleh admin unit Anda.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Sesi Pelatihan</label>
            <select required value={idJadwalInput} onChange={e => setIdJadwalInput(e.target.value)} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:outline-none">
              <option value="">-- Pilih Sesi yang Sudah Diikuti --</option>
              {jadwalBelumDinilai.map(j => (
                <option key={j.id_jadwal} value={j.id_jadwal}>
                  [{j.tanggal_pelatihan}] {j.type_pelatihan?.nama_pelatihan}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Nilai Pre-Test <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span></label>
              <input type="number" min="0" max="100" placeholder="0-100" value={nilaiPre} onChange={e => setNilaiPre(e.target.value)} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Nilai Post-Test</label>
              <input type="number" required min="0" max="100" placeholder="0-100" value={nilaiPost} onChange={e => setNilaiPost(e.target.value)} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:outline-none" />
            </div>
          </div>

          <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2.5 rounded-lg font-bold text-xs hover:bg-sky-400 transition-all cursor-pointer">
            Simpan & Ajukan Verifikasi
          </button>
        </form>
      )}

      {/* Rangkuman Metrik Kompetensi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400"><Award className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono uppercase">Pelatihan Lulus (Terverifikasi)</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{allScores.filter(v => v.is_verified && v.status === 'Lulus').length} Kelas</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><Clock className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono uppercase">Total Jam Pelatihan</p>
            <h3 className="text-2xl font-bold text-emerald-400">{totalHours} / 10 Jam <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Target Tahunan)</span></h3>
          </div>
        </div>
      </div>

      {/* Grid Kartu Nilai: menampilkan SEMUA nilai milik user, baik sudah maupun belum diverifikasi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {allScores.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm col-span-full">Belum ada nilai pelatihan yang tercatat. Ikuti sesi pelatihan lalu input nilai Anda di sini.</p>
        ) : (
          allScores.map((cert) => (
            <div key={cert.id_hasil} className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg   transition-all duration-300
                                                                                                                                                                hover:border-sky-500
                                                                                                                                                                hover:-translate-y-1
                                                                                                                                                                dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.25)] flex flex-col justify-between">
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono bg-sky-50 dark:bg-slate-900 px-2 py-0.5 text-slate-500 dark:text-slate-400 rounded">{cert.jadwal_pelatihan?.type_pelatihan?.nama_pelatihan || `SESI ${cert.id_jadwal}`}</span>
                  {cert.is_verified ? (
                    <ShieldCheck className="w-5 h-5 text-sky-400" aria-label="Terverifikasi" />
                  ) : (
                    <Hourglass className="w-5 h-5 text-amber-400" aria-label="Menunggu verifikasi" />
                  )}
                </div>
                <div>
                  <h4 className="font-mono text-xs text-slate-500 dark:text-slate-400">TANGGAL SESI</h4>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">{cert.jadwal_pelatihan?.tanggal_pelatihan || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-sky-50/70 dark:bg-slate-900/40 p-2.5 rounded-lg border border-sky-200/60 dark:border-slate-700/50 text-center font-mono">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">PRE-TEST</p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{cert.nilai_pretest ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">POST-TEST</p>
                    <p className="text-sm font-bold text-sky-400">{cert.nilai_posttest ?? '-'}</p>
                  </div>
                </div>
              </div>
              <div className={`p-3 text-center text-xs font-bold font-mono border-t ${
                !cert.is_verified
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : cert.status === 'Lulus'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {!cert.is_verified
                  ? '⏳ MENUNGGU VERIFIKASI ADMIN'
                  : cert.status === 'Lulus' ? '✓ LULUS DAN TERVERIFIKASI' : '✕ TIDAK LULUS, TERVERIFIKASI'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
