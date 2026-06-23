import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext'; // Mengambil data login terkini
import { Edit2, Trash2, X, RefreshCw, ShieldCheck, DatabaseZap } from 'lucide-react';

export const ManajemenPenilaian: React.FC = () => {
  const { user } = useAuth(); // Ambil data user untuk cek role
  const [scoresList, setScoresList] = useState<any[]>([]);
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [jadwalList, setJadwalList] = useState<any[]>([]);
  const [pesertaJadwalList, setPesertaJadwalList] = useState<any[]>([]); // relasi peserta yang terdaftar per jadwal (via perner)
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Deteksi Role: SPV sekarang setara Admin untuk CRUD penilaian (hanya Manajemen Master yang dikunci untuk SPV)
  const currentRole = user && user.role ? String(user.role).toLowerCase() : 'user';
  const isSpv = currentRole === 'spv';

  // States Form Utama
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [idPeserta, setIdPeserta] = useState('');
  const [idJadwal, setIdJadwal] = useState('');
  const [nilaiPre, setNilaiPre] = useState('');
  const [nilaiPost, setNilaiPost] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // States Kalkulasi Live Sebelum Save
  const [liveNilaiAkhir, setLiveNilaiAkhir] = useState<number | string>('-');
  const [liveKategoriPre, setLiveKategoriPre] = useState('-');
  const [liveKategoriPost, setLiveKategoriPost] = useState('-');
  const [liveStatus, setLiveStatus] = useState('-');

  // FILTER PESERTA BERDASARKAN JADWAL TERPILIH:
  // Hanya tampilkan peserta yang punya record di tabel peserta_jadwal untuk id_jadwal yang sedang dipilih.
  // Relasi dijembatani lewat kolom "perner" (peserta_jadwal.perner === data_peserta.perner).
  const filteredPesertaList = React.useMemo(() => {
    if (isEditing) return pesertaList; // mode edit: select disabled, tampilkan semua agar nama tersimpan tetap terlihat
    if (!idJadwal) return pesertaList; // belum pilih jadwal -> tampilkan semua (default)

    const pernerTerdaftar = new Set(
      pesertaJadwalList
        .filter(pj => String(pj.id_jadwal) === String(idJadwal))
        .map(pj => pj.perner)
    );

    return pesertaList.filter(p => pernerTerdaftar.has(p.perner));
  }, [idJadwal, pesertaList, pesertaJadwalList, isEditing]);

  // Jika jadwal diganti dan peserta yang sedang terpilih ternyata tidak terdaftar di jadwal baru,
  // reset pilihan peserta supaya tidak ada inkonsistensi data (kecuali sedang mode edit).
  useEffect(() => {
    if (isEditing) return;
    if (idPeserta && !filteredPesertaList.some(p => String(p.id_peserta) === String(idPeserta))) {
      setIdPeserta('');
    }
  }, [idJadwal, filteredPesertaList, isEditing]);

  const hitungGrade = (nilai: number): string => {
    if (nilai >= 90) return 'A';
    if (nilai >= 80) return 'B';
    if (nilai >= 70) return 'C';
    if (nilai >= 60) return 'D';
    return 'E';
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setIdPeserta('');
    setIdJadwal('');
    setNilaiPre('');
    setNilaiPost('');
    setKeterangan('');
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('data_peserta').select('id_peserta, perner, nama_peserta');
      const { data: jData } = await supabase.from('jadwal_pelatihan').select(`
        id_jadwal, tanggal_pelatihan, type_pelatihan (nama_pelatihan)
      `);

      const { data: sData } = await supabase.from('hasil_pelatihan').select(`
        id_hasil, id_peserta, id_jadwal, nilai_pretest, kategori_pretest, nilai_posttest, kategori_posttest, nilai_akhir, status, keterangan, is_verified,
        data_peserta (perner, nama_peserta),
        jadwal_pelatihan (tanggal_pelatihan, type_pelatihan (nama_pelatihan))
      `).order('id_hasil', { ascending: false });

      // Relasi peserta yang terdaftar di tiap jadwal pelatihan (dipakai untuk filter dropdown Nama Karyawan)
      const { data: pjData } = await supabase.from('peserta_jadwal').select('id_peserta_jadwal, id_jadwal, perner, status');

      setPesertaList(pData || []);
      setJadwalList(jData || []);
      setScoresList(sData || []);
      setPesertaJadwalList(pjData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // LOGIKA NILAI AKHIR BARU:
  // - Jika Pre-Test DAN Post-Test diisi -> nilai akhir = rata-rata (pre + post) / 2
  // - Jika hanya Post-Test diisi (Pre-Test kosong) -> nilai akhir = nilai Post-Test saja
  useEffect(() => {
    if (nilaiPost === '') {
      setLiveNilaiAkhir('-'); setLiveKategoriPre('-'); setLiveKategoriPost('-'); setLiveStatus('-');
      return;
    }

    const post = Number(nilaiPost);
    const hasPre = nilaiPre !== '';
    const pre = hasPre ? Number(nilaiPre) : null;

    const akhir = hasPre && pre !== null ? (pre + post) / 2 : post;

    setLiveNilaiAkhir(akhir);
    setLiveKategoriPre(hasPre && pre !== null ? hitungGrade(pre) : '-');
    setLiveKategoriPost(hitungGrade(post));
    setLiveStatus(akhir >= 60 ? 'Lulus' : 'Tidak Lulus');
  }, [nilaiPre, nilaiPost]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idPeserta || !idJadwal) return alert('Pilih komponen karyawan dan jadwal dahulu!');
    if (nilaiPost === '') return alert('Nilai Post-Test wajib diisi!');

    const hasPre = nilaiPre !== '';

    const payload = {
      id_peserta: Number(idPeserta),
      id_jadwal: Number(idJadwal),
      nilai_pretest: hasPre ? Number(nilaiPre) : null,
      kategori_pretest: hasPre ? liveKategoriPre : null,
      nilai_posttest: Number(nilaiPost),
      kategori_posttest: liveKategoriPost,
      nilai_akhir: Number(liveNilaiAkhir),
      status: liveStatus,
      keterangan: keterangan,
      is_verified: true
    };

    try {
      if (isEditing && currentId) {
        // MODE EDIT: update berdasarkan id_hasil yang sudah pasti ada
        const { error } = await supabase.from('hasil_pelatihan').update(payload).eq('id_hasil', currentId);
        if (error) throw error;
      } else {
        // MODE TAMBAH BARU: cek dulu apakah kombinasi peserta + jadwal ini sudah punya record
        // (mis. dari input mandiri karyawan yang belum diverifikasi). Jika ada -> UPDATE record itu,
        // bukan INSERT baru. Ini menghilangkan error "duplicate key value violates unique constraint
        // hasil_pelatihan_pkey" karena kita tidak lagi membuat baris kedua untuk kombinasi yang sama.
        const { data: existing, error: checkError } = await supabase
          .from('hasil_pelatihan')
          .select('id_hasil')
          .eq('id_peserta', payload.id_peserta)
          .eq('id_jadwal', payload.id_jadwal)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existing?.id_hasil) {
          const { error } = await supabase.from('hasil_pelatihan').update(payload).eq('id_hasil', existing.id_hasil);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('hasil_pelatihan').insert([payload]);
          if (error) throw error;
        }
      }
      resetForm();
      fetchAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyMandiri = async (idHasil: number) => {
    if (!confirm('Verifikasi keabsahan nilai inputan mandiri karyawan ini?')) return;
    try {
      const { error } = await supabase.from('hasil_pelatihan').update({ is_verified: true }).eq('id_hasil', idHasil);
      if (error) throw error;
      fetchAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (idHasil: number) => {
    if (!confirm('Hapus record penilaian peserta ini secara permanen dari sistem?')) return;
    try {
      const { error } = await supabase.from('hasil_pelatihan').delete().eq('id_hasil', idHasil);
      if (error) throw error;
      fetchAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEdit = (s: any) => {
    setIsEditing(true);
    setCurrentId(s.id_hasil);
    setIdPeserta(String(s.id_peserta));
    setIdJadwal(String(s.id_jadwal));
    setNilaiPre(s.nilai_pretest ?? '');
    setNilaiPost(s.nilai_posttest ?? '');
    setKeterangan(s.keterangan ?? '');
  };

  // FITUR RESET SEQUENCE: PostgreSQL/Supabase kadang membuat sequence id_hasil "out of sync"
  // dengan data aktual di tabel (biasanya setelah hapus/insert manual lewat dashboard Supabase),
  // sehingga insert baru bisa bentrok dengan id lama yang sudah terpakai (duplicate key).
  // Claude tidak memiliki akses langsung ke database Supabase, jadi tombol ini menampilkan
  // query SQL yang perlu dijalankan Sejati sendiri di Supabase SQL Editor.
  const handleResetSequence = () => {
    setResetting(true);
    const sql = `SELECT setval(
  pg_get_serial_sequence('hasil_pelatihan', 'id_hasil'),
  COALESCE((SELECT MAX(id_hasil) FROM hasil_pelatihan), 1)
);`;
    navigator.clipboard?.writeText(sql).catch(() => {});
    alert(
      'Query SQL untuk reset sequence sudah disalin ke clipboard.\n\n' +
      'Jalankan query berikut di Supabase Dashboard > SQL Editor:\n\n' + sql +
      '\n\nIni akan menyamakan kembali nomor urut id_hasil dengan data yang sudah ada, ' +
      'sehingga error duplicate key tidak terjadi lagi akibat sequence yang tidak sinkron.'
    );
    setResetting(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Manajemen Penilaian</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isSpv ? 'Mode Supervisor: Anda dapat mengelola seluruh nilai hasil pelatihan karyawan.' : 'Sinkronisasi parameter nilai, konversi grade, dan aksi verifikasi kelulusan pelatihan.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSequence}
            disabled={resetting}
            title="Salin query SQL untuk menyamakan sequence id_hasil dengan data aktual"
            className="flex items-center space-x-1.5 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 rounded-lg text-amber-500 hover:text-slate-950 text-xs font-semibold cursor-pointer transition-colors"
          >
            <DatabaseZap className="w-4 h-4" /> <span>Reset Sequence Nilai</span>
          </button>
          <button onClick={fetchAllData} disabled={loading} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-700 border border-sky-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAMPILAN GRID: SPV sekarang mendapat form penuh seperti Admin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-200 dark:border-slate-700 space-y-3.5 h-fit">
          <div className="flex justify-between items-center border-b border-sky-200/60 dark:border-slate-700/50 pb-2">
            <h3 className="font-bold text-sky-400 text-xs uppercase font-mono tracking-wider">
              {isEditing ? 'Koreksi Nilai / Edit Mode' : 'Input Nilai Pelatihan'}
            </h3>
            {isEditing && (
              <button type="button" onClick={resetForm} className="text-slate-500 dark:text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Sesi Pelatihan</label>
            <select required value={idJadwal} onChange={e => setIdJadwal(e.target.value)} disabled={isEditing} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:outline-none">
              <option value="">-- Pilih Jadwal Kelas --</option>
              {jadwalList.map(j => (
                <option key={j.id_jadwal} value={j.id_jadwal}>
                  [{j.tanggal_pelatihan}] {j.type_pelatihan?.nama_pelatihan}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Nama Karyawan</label>
            <select required value={idPeserta} onChange={e => setIdPeserta(e.target.value)} disabled={isEditing || !idJadwal} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:outline-none disabled:opacity-60">
              <option value="">
                {!idJadwal ? '-- Pilih Jadwal Pelatihan dahulu --' : filteredPesertaList.length === 0 ? '-- Tidak ada peserta terdaftar di jadwal ini --' : '-- Pilih Peserta --'}
              </option>
              {filteredPesertaList.map(p => <option key={p.id_peserta} value={p.id_peserta}>{p.perner} - {p.nama_peserta}</option>)}
            </select>
            {idJadwal && filteredPesertaList.length === 0 && (
              <p className="text-[10px] text-amber-500 mt-1">Belum ada peserta yang terdaftar (peserta_jadwal) untuk jadwal ini.</p>
            )}
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

          <div className="bg-sky-50/80 dark:bg-slate-900/80 p-3 rounded-xl border border-sky-200/60 dark:border-slate-700/60 grid grid-cols-3 gap-1 text-center font-mono text-[11px]">
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase">Nilai Akhir</p>
              <p className="font-bold text-sky-400 text-sm mt-0.5">
                {typeof liveNilaiAkhir === 'number' ? liveNilaiAkhir.toFixed(1) : liveNilaiAkhir}
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-[8px] normal-case mt-0.5">
                {nilaiPre !== '' ? 'rata-rata pre+post' : 'dari post-test'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase">Grade</p>
              <p className="font-bold text-amber-400 text-xs mt-1">{liveKategoriPre} / {liveKategoriPost}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase">Kelulusan</p>
              <p className={`font-bold text-[10px] uppercase mt-1 ${liveStatus === 'Lulus' ? 'text-emerald-400' : 'text-red-400'}`}>{liveStatus}</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Keterangan Catatan</label>
            <textarea placeholder="Catatan..." value={keterangan} onChange={e => setKeterangan(e.target.value)} className="w-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white h-14 resize-none focus:outline-none" />
          </div>

          <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2.5 rounded-lg font-bold text-xs hover:bg-sky-400 transition-all cursor-pointer">
            {isEditing ? 'Simpan Pembaruan Nilai' : 'Daftarkan Hasil Penilaian'}
          </button>
        </form>

        {/* VIEW TABEL DATA PENILAIAN */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-slate-700 overflow-hidden h-fit">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-sky-200 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-mono border-b border-sky-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Karyawan / Pelatihan</th>
                  <th className="p-3 text-center">Pre</th>
                  <th className="p-3 text-center">Post</th>
                  <th className="p-3 text-center">Akhir & Status</th>
                  <th className="p-3 text-center">Verifikasi</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200 dark:divide-slate-700">
                {scoresList.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">Belum ada data nilai terkumpul.</td></tr>
                ) : (
                  scoresList.map(s => {
                    const na = Number(s.nilai_akhir) || 0;
                    return (
                      <tr key={s.id_hasil} className="hover:bg-sky-50 dark:hover:bg-slate-500/50 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">{s.data_peserta?.nama_peserta || 'Guest'}</p>
                          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-mono">
                            PERNER: {s.data_peserta?.perner} • {s.jadwal_pelatihan?.type_pelatihan?.nama_pelatihan}
                          </p>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500 dark:text-slate-400">
                          {s.nilai_pretest ?? '-'} <span className="text-[9px] text-slate-400 dark:text-slate-500">{s.kategori_pretest ? `(${s.kategori_pretest})` : ''}</span>
                        </td>
                        <td className="p-3 text-center font-mono text-sky-400 font-medium">
                          {s.nilai_posttest ?? '-'} <span className="text-[9px] text-slate-400 dark:text-slate-500">{s.kategori_posttest ? `(${s.kategori_posttest})` : ''}</span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <p className="font-bold text-slate-700 dark:text-slate-200">{na.toFixed(1)}</p>
                          <span className={`text-[9px] px-1 rounded font-sans font-bold uppercase ${s.status === 'Lulus' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {s.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <button type="button" onClick={() => handleVerifyMandiri(s.id_hasil)} className="text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono text-[10px] cursor-pointer">
                              Belum Verifikasi — Verify
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center items-center space-x-3">
                            <button type="button" onClick={() => startEdit(s)} className="text-amber-400 hover:text-amber-500 cursor-pointer">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDelete(s.id_hasil)} className="text-red-400 hover:text-red-500 cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      </div>
    </div>
  );
};
