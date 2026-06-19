import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Edit2 } from 'lucide-react';

export const ManajemenPenilaian: React.FC = () => {
  const [scoresList, setScoresList] = useState<any[]>([]);
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [jadwalList, setJadwalList] = useState<any[]>([]);

  // States Form
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  const [idPeserta, setIdPeserta] = useState('');
  const [idJadwal, setIdJadwal] = useState('');
  const [nilaiPre, setNilaiPre] = useState('');
  const [nilaiPost, setNilaiPost] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // States Kalkulasi Live
  const [liveNilaiAkhir, setLiveNilaiAkhir] = useState<number | string>('-');
  const [liveKategori, setLiveKategori] = useState('-');
  const [liveStatus, setLiveStatus] = useState('-');

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
      const { data: pData } = await supabase.from('data_peserta').select('id_peserta, perner, nama_peserta');
      const { data: jData } = await supabase.from('jadwal_pelatihan').select(`
        id_jadwal, tanggal_pelatihan, type_pelatihan (nama_pelatihan)
      `);
      
      const { data: sData } = await supabase.from('hasil_pelatihan').select(`
        *,
        data_peserta (perner, nama_peserta),
        jadwal_pelatihan (tanggal_pelatihan, type_pelatihan (nama_pelatihan))
      `).order('id_hasil', { ascending: false });

      setPesertaList(pData || []);
      setJadwalList(jData || []);
      setScoresList(sData || []);
    } catch (err) {
      console.error(err);
    } finally {
      resetForm();
    }
  };

  // Logika Kalkulasi Otomatis
  useEffect(() => {
    const pre = Number(nilaiPre);
    const post = Number(nilaiPost);
    if (nilaiPre === '' || nilaiPost === '') {
      setLiveNilaiAkhir('-'); setLiveKategori('-'); setLiveStatus('-');
    } else {
      const akhir = (pre + post) / 2;
      setLiveNilaiAkhir(akhir);
      let grade = 'E';
      if (akhir >= 90) grade = 'A'; else if (akhir >= 80) grade = 'B'; else if (akhir >= 70) grade = 'C'; else if (akhir >= 60) grade = 'D';
      setLiveKategori(grade);
      setLiveStatus(akhir >= 60 ? 'Lulus' : 'Tidak Lulus');
    }
  }, [nilaiPre, nilaiPost]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id_peserta: Number(idPeserta),
      id_jadwal: Number(idJadwal),
      nilai_pre_test: Number(nilaiPre),
      nilai_post_test: Number(nilaiPost),
      status: liveStatus,
      keterangan: keterangan,
      is_verified: true
    };

    try {
      if (isEditing && currentId) {
        await supabase.from('hasil_pelatihan').update(payload).eq('id_hasil', currentId);
      } else {
        await supabase.from('hasil_pelatihan').insert([payload]);
      }
      fetchAllData();
    } catch (err: any) { alert(err.message); }
  };

  useEffect(() => { 
    fetchAllData(); 
  }, []);

  return (
    <div className="p-6 space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold text-sky-400">Manajemen Penilaian</h1>
        <p className="text-sm text-slate-400">Input nilai, kalkulasi grade, dan verifikasi kelulusan peserta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM INPUT */}
        <form onSubmit={handleSave} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3 h-fit">
          <select required value={idPeserta} onChange={e => setIdPeserta(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
            <option value="">-- Pilih Peserta --</option>
            {pesertaList.map(p => <option key={p.id_peserta} value={p.id_peserta}>{p.nama_peserta}</option>)}
          </select>
          <select required value={idJadwal} onChange={e => setIdJadwal(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
            <option value="">-- Pilih Jadwal --</option>
            {jadwalList.map(j => <option key={j.id_jadwal} value={j.id_jadwal}>{j.type_pelatihan?.nama_pelatihan}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" required placeholder="Pre-Test" value={nilaiPre} onChange={e => setNilaiPre(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" />
            <input type="number" required placeholder="Post-Test" value={nilaiPost} onChange={e => setNilaiPost(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" />
          </div>
          <div className="text-[10px] font-mono bg-slate-900/50 p-2 rounded text-center">
            Akhir: <span className="font-bold text-sky-400">{liveNilaiAkhir}</span> | Grade: <span className="font-bold text-emerald-400">{liveKategori}</span> | Status: <span className={`font-bold ${liveStatus === 'Lulus' ? 'text-emerald-400' : 'text-red-400'}`}>{liveStatus}</span>
          </div>
          <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2 rounded-lg font-bold text-xs hover:bg-sky-400">Simpan Penilaian</button>
        </form>

        {/* TABEL */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-850 text-slate-400 uppercase font-mono">
              <tr><th className="p-3">Peserta</th><th className="p-3">Nilai Akhir</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {scoresList.map(s => {
                const finalVal = ((s.nilai_pre_test + s.nilai_post_test) / 2) || 0;
                return (
                  <tr key={s.id_hasil}>
                    <td className="p-3 font-semibold">{s.data_peserta?.nama_peserta}</td>
                    <td className="p-3 font-mono">{finalVal.toFixed(1)}</td>
                    <td className="p-3 font-bold">{s.status}</td>
                    <td className="p-3 flex space-x-2">
                      <button type="button" onClick={() => { setIsEditing(true); setCurrentId(s.id_hasil); setIdPeserta(s.id_peserta); setIdJadwal(s.id_jadwal); setNilaiPre(s.nilai_pre_test); setNilaiPost(s.nilai_post_test); }}><Edit2 className="w-4 h-4 text-amber-400"/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};