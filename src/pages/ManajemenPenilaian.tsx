import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Edit2, Trash2, X, RefreshCw, } from 'lucide-react';

export const ManajemenPenilaian: React.FC = () => {
  const [scoresList, setScoresList] = useState<any[]>([]);
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [jadwalList, setJadwalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Helper Konversi Grade Berdasarkan Skema Aturan (90, 80, 70, 60)
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
      
      // Sinkronisasi pemanggilan data sesuai dengan field asli di skema gambar
      const { data: sData } = await supabase.from('hasil_pelatihan').select(`
        id_hasil, id_peserta, id_jadwal, nilai_pretest, kategori_pretest, nilai_posttest, kategori_posttest, nilai_akhir, status, keterangan, is_verified,
        data_peserta (perner, nama_peserta),
        jadwal_pelatihan (tanggal_pelatihan, type_pelatihan (nama_pelatihan))
      `).order('id_hasil', { ascending: false });

      setPesertaList(pData || []);
      setJadwalList(jData || []);
      setScoresList(sData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Logika Pendeteksi Otomatisasi Nilai & Kategori
  useEffect(() => {
    if (nilaiPre === '' || nilaiPost === '') {
      setLiveNilaiAkhir('-'); setLiveKategoriPre('-'); setLiveKategoriPost('-'); setLiveStatus('-');
      return;
    }

    const pre = Number(nilaiPre);
    const post = Number(nilaiPost);
    const akhir = (pre + post) / 2;

    setLiveNilaiAkhir(akhir);
    setLiveKategoriPre(hitungGrade(pre));
    setLiveKategoriPost(hitungGrade(post));
    setLiveStatus(akhir >= 60 ? 'Lulus' : 'Tidak Lulus');
  }, [nilaiPre, nilaiPost]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idPeserta || !idJadwal) return alert('Pilih komponen karyawan dan jadwal dahulu!');

    // Payload dibentuk mengikuti struktur kolom database asli di skema gambar Anda
    const payload = {
      id_peserta: Number(idPeserta),
      id_jadwal: Number(idJadwal),
      nilai_pretest: Number(nilaiPre),
      kategori_pretest: liveKategoriPre,
      nilai_posttest: Number(nilaiPost),
      kategori_posttest: liveKategoriPost,
      nilai_akhir: Number(liveNilaiAkhir),
      status: liveStatus,
      keterangan: keterangan,
      is_verified: true
    };

    try {
      if (isEditing && currentId) {
        const { error } = await supabase.from('hasil_pelatihan').update(payload).eq('id_hasil', currentId);
        if (error) throw error;
        alert('Koreksi data nilai sukses diperbarui!');
      } else {
        const { error } = await supabase.from('hasil_pelatihan').insert([payload]);
        if (error) throw error;
        alert('Data penilaian baru berhasil tersimpan!');
      }
      resetForm();
      fetchAllData();
    } catch (err: any) { 
      alert('Gagal mengeksekusi ke database: ' + err.message); 
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

  useEffect(() => { 
    fetchAllData(); 
  }, []);

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Manajemen Penilaian</h1>
          <p className="text-sm text-slate-400">Sinkronisasi parameter nilai, konversi grade, dan aksi verifikasi kelulusan diklat.</p>
        </div>
        <button onClick={fetchAllData} disabled={loading} className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 cursor-pointer disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM OPERASIONAL */}
        <form onSubmit={handleSave} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3.5 h-fit">
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
            <h3 className="font-bold text-sky-400 text-xs uppercase font-mono tracking-wider">
              {isEditing ? 'Koreksi Nilas / Edit Mode' : 'Entri Nilai Pelatihan'}
            </h3>
            {isEditing && (
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Karyawan</label>
            <select required value={idPeserta} onChange={e => setIdPeserta(e.target.value)} disabled={isEditing} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none disabled:opacity-50">
              <option value="">-- Pilih Peserta --</option>
              {pesertaList.map(p => <option key={p.id_peserta} value={p.id_peserta}>{p.perner} - {p.nama_peserta}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sesi Pelatihan</label>
            <select required value={idJadwal} onChange={e => setIdJadwal(e.target.value)} disabled={isEditing} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none disabled:opacity-50">
              <option value="">-- Pilih Jadwal Kelas --</option>
              {jadwalList.map(j => (
                <option key={j.id_jadwal} value={j.id_jadwal}>
                  [{j.tanggal_pelatihan}] {j.type_pelatihan?.nama_pelatihan}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nilai Pre-Test</label>
              <input type="number" required min="0" max="100" placeholder="0-100" value={nilaiPre} onChange={e => setNilaiPre(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nilai Post-Test</label>
              <input type="number" required min="0" max="100" placeholder="0-100" value={nilaiPost} onChange={e => setNilaiPost(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none" />
            </div>
          </div>

          {/* REAL-TIME PREVIEW BADGE */}
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 grid grid-cols-3 gap-1 text-center font-mono text-[11px]">
            <div>
              <p className="text-slate-500 text-[9px] uppercase">Rata-rata</p>
              <p className="font-bold text-sky-400 text-sm mt-0.5">
                {typeof liveNilaiAkhir === 'number' ? liveNilaiAkhir.toFixed(1) : liveNilaiAkhir}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase">Grade (Pre/Post)</p>
              <p className="font-bold text-amber-400 text-xs mt-1">
                {liveKategoriPre} / {liveKategoriPost}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase">Kelulusan</p>
              <p className={`font-bold text-[10px] uppercase mt-1 ${liveStatus === 'Lulus' ? 'text-emerald-400' : 'text-red-400'}`}>
                {liveStatus}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Keterangan Catatan</label>
            <textarea placeholder="Catatan kelulusan..." value={keterangan} onChange={e => setKeterangan(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white h-14 resize-none focus:outline-none" />
          </div>

          <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2.5 rounded-lg font-bold text-xs hover:bg-sky-400 transition-all cursor-pointer">
            {isEditing ? 'Simpan Pembaruan Nilai' : 'Daftarkan Hasil Penilaian'}
          </button>
        </form>

        {/* VIEW TABEL */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden h-fit">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-850 text-slate-400 uppercase font-mono border-b border-slate-700">
                <tr>
                  <th className="p-3">Karyawan / Pelatihan</th>
                  <th className="p-3 text-center">Pre</th>
                  <th className="p-3 text-center">Post</th>
                  <th className="p-3 text-center">Akhir & Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {scoresList.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500 font-mono text-[11px]">Belum ada data nilai terkumpul.</td></tr>
                ) : (
                  scoresList.map(s => {
                    const na = Number(s.nilai_akhir) || 0;
                    return (
                      <tr key={s.id_hasil} className="hover:bg-slate-750/20 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-slate-100">{s.data_peserta?.nama_peserta || 'Guest'}</p>
                          <p className="text-slate-500 text-[10px] font-mono">
                            PERNER: {s.data_peserta?.perner} • {s.jadwal_pelatihan?.type_pelatihan?.nama_helatihan || s.jadwal_pelatihan?.type_pelatihan?.nama_pelatihan}
                          </p>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-400">
                          {s.nilai_pretest} <span className="text-[9px] text-slate-500">({s.kategori_pretest})</span>
                        </td>
                        <td className="p-3 text-center font-mono text-sky-400 font-medium">
                          {s.nilai_posttest} <span className="text-[9px] text-slate-500">({s.kategori_posttest})</span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <p className="font-bold text-slate-200">{na.toFixed(1)}</p>
                          <span className={`text-[9px] px-1 rounded font-sans font-bold uppercase ${s.status === 'Lulus' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center items-center space-x-3">
                            {/* Tombol verifikasi khusus inputan mandiri user */}
                            {!s.is_verified && (
                              <button type="button" onClick={() => handleVerifyMandiri(s.id_hasil)} className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono text-[10px] cursor-pointer">
                                Verify
                              </button>
                            )}
                            <button type="button" onClick={() => startEdit(s)} className="text-amber-400 hover:text-amber-500 cursor-pointer" title="Edit Nilai">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDelete(s.id_hasil)} className="text-red-400 hover:text-red-500 cursor-pointer" title="Hapus Record">
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