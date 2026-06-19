import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext'; // Ambil data login terkini
import { Plus, Trash2, Edit2, Check, X, Users, UserPlus, RefreshCw } from 'lucide-react';

export const JadwalPelatihan: React.FC = () => {
  const { user } = useAuth(); // Ambil data user untuk deteksi role
  const [schedules, setSchedules] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [allPeserta, setAllPeserta] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // Deteksi Role SPV secara ketat
  const currentRole = user && user.role ? String(user.role).toLowerCase() : 'user';
  const isSpv = currentRole === 'spv';

  // States Form Tambah Baru
  const [idPelatihan, setIdPelatihan] = useState('');
  const [idTrainer, setIdTrainer] = useState('');
  const [idLokasi, setIdLokasi] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [waktuMulai, setWaktuMulai] = useState('08:00');
  const [waktuSelesai, setWaktuSelesai] = useState('11:00');
  const [biaya, setBiaya] = useState('');

  // States Mode Edit, Modal Peserta & Assign Peserta
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<any>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJadwalId, setSelectedJadwalId] = useState<number | null>(null);
  const [currentJadwalTitle, setCurrentJadwalTitle] = useState('');
  const [assignedPeserta, setAssignedPeserta] = useState<any[]>([]);
  const [selectedPernerToAssign, setSelectedPernerToAssign] = useState('');
  const [loadingPeserta, setLoadingPeserta] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setEditingId(null);
      
      const { data: resTypes } = await supabase.from('type_pelatihan').select('*');
      const { data: resTrainers } = await supabase.from('data_trainer').select('*');
      const { data: resLocations } = await supabase.from('tempat_pelatihan').select('*');
      const { data: resPeserta } = await supabase.from('data_peserta').select('perner, nama_peserta');
      
      setTypes(resTypes || []);
      setTrainers(resTrainers || []);
      setLocations(resLocations || []);
      setAllPeserta(resPeserta || []);

      const { data: resSchedules, error } = await supabase
        .from('jadwal_pelatihan')
        .select(`
          *,
          type_pelatihan (nama_pelatihan)
        `)
        .order('id_jadwal', { ascending: false });

      if (error) throw error;
      setSchedules(resSchedules || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (start: string, end: string): string => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMins < 0) diffMins += 24 * 60;
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  };

  const handleCreateJadwal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSpv) return alert('Akses ditolak: Supervisor tidak diizinkan memodifikasi data.');
    try {
      const computedDurasi = calculateDuration(waktuMulai, waktuSelesai);
      const { error } = await supabase
        .from('jadwal_pelatihan')
        .insert([{
          id_pelatihan: idPelatihan,
          id_trainer: idTrainer ? Number(idTrainer) : null,
          id_lokasi: idLokasi ? Number(idLokasi) : null,
          tanggal_pelatihan: tanggal,
          waktu_mulai: waktuMulai + ":00",
          waktu_selesai: waktuSelesai + ":00",
          durasi: computedDurasi,
          biaya: Number(biaya)
        }]);

      if (error) throw error;
      setBiaya(''); setTanggal(''); fetchAllData();
    } catch (err: any) {
      alert(`Gagal membuat jadwal: ${err.message}`);
    }
  };

const handleUpdateJadwal = async (id: number) => {
    if (isSpv) return;
    try {
      const computedDurasi = calculateDuration(editFields.waktu_mulai, editFields.waktu_selesai);
      const { error } = await supabase
        .from('jadwal_pelatihan')
        .update({
          id_pelatihan: editFields.id_pelatihan,
          id_trainer: Number(editFields.id_trainer),
          id_lokasi: Number(editFields.id_lokasi),
          tanggal_pelatihan: editFields.tanggal_pelatihan,
          waktu_mulai: editFields.waktu_mulai + ":00",
          waktu_selesai: editFields.waktu_selesai + ":00",
          durasi: computedDurasi,
          biaya: Number(editFields.biaya)
        })
        .eq('id_jadwal', id); // <-- Sudah diperbaiki dari .update menjadi .eq

      if (error) throw error;
      fetchAllData();
    } catch (err: any) {
      alert(`Gagal update: ${err.message}`);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (isSpv) return;
    if (!confirm('Hapus plot kelas terjadwal ini?')) return;
    try {
      const { error } = await supabase.from('jadwal_pelatihan').delete().eq('id_jadwal', id);
      if (error) throw error;
      fetchAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const viewAndManagePeserta = async (idJadwal: number, pelatihanName: string) => {
    setSelectedJadwalId(idJadwal);
    setCurrentJadwalTitle(`Sesi ${idJadwal} - ${pelatihanName}`);
    setModalOpen(true);
    fetchAssignedPeserta(idJadwal);
  };

  const fetchAssignedPeserta = async (idJadwal: number) => {
    setLoadingPeserta(true);
    try {
      const { data, error } = await supabase
        .from('peserta_jadwal')
        .select('perner')
        .eq('id_jadwal', idJadwal);

      if (error) throw error;

      if (data && data.length > 0) {
        const listPerner = data.map(p => p.perner);
        const { data: profiles } = await supabase
          .from('data_peserta')
          .select('perner, nama_peserta, job_position, asal_perusahaan')
          .in('perner', listPerner);
        setAssignedPeserta(profiles || []);
      } else {
        setAssignedPeserta([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPeserta(false);
    }
  };

  const handleAssignPeserta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSpv) return;
    if (!selectedJadwalId || !selectedPernerToAssign) return;

    try {
      const isExist = assignedPeserta.some(p => p.perner === selectedPernerToAssign);
      if (isExist) {
        alert("Karyawan ini sudah terdaftar di dalam kelas!");
        return;
      }

      const { error: regError } = await supabase
        .from('peserta_jadwal')
        .insert([{ id_jadwal: selectedJadwalId, perner: selectedPernerToAssign }]);

      if (regError) throw regError;

      const { data: pData } = await supabase
        .from('data_peserta')
        .select('id_peserta')
        .eq('perner', selectedPernerToAssign)
        .maybeSingle();

      if (pData?.id_peserta) {
        await supabase
          .from('hasil_pelatihan')
          .insert([{ 
            id_jadwal: selectedJadwalId, 
            id_peserta: pData.id_peserta, 
            status: 'Tidak Lulus', 
            is_verified: false 
          }]);
      }

      setSelectedPernerToAssign('');
      fetchAssignedPeserta(selectedJadwalId);
    } catch (err: any) {
      alert("Gagal assign peserta: " + err.message);
    }
  };

  const handleRemovePeserta = async (pernerPeserta: string) => {
    if (isSpv) return;
    if (!selectedJadwalId || !confirm("Batalkan keikutsertaan karyawan ini dari kelas?")) return;
    try {
      const { data: pData } = await supabase
        .from('data_peserta')
        .select('id_peserta')
        .eq('perner', pernerPeserta)
        .maybeSingle();

      if (pData?.id_peserta) {
        await supabase
          .from('hasil_pelatihan')
          .delete()
          .eq('id_jadwal', selectedJadwalId)
          .eq('id_peserta', pData.id_peserta);
      }

      const { error } = await supabase
        .from('peserta_jadwal')
        .delete()
        .eq('id_jadwal', Number(selectedJadwalId))
        .eq('perner', String(pernerPeserta));

      if (error) throw error;
      fetchAssignedPeserta(selectedJadwalId);
    } catch (err: any) {
      alert("Gagal unassign peserta: " + err.message);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <div className="p-6 space-y-6 text-white relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">
            {isSpv ? 'Monitoring Jadwal' : 'Jadwal Pelatihan'}
          </h1>
          <p className="text-sm text-slate-400 font-mono">
            {isSpv ? 'Mode Peninjau: Memantau plot durasi dan anggaran anggaran pelatihan korporat.' : 'Sequential Auto-ID • Durasi Otomatis • Peserta Monitoring'}
          </p>
        </div>
        <button onClick={fetchAllData} className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RENDER FORM HANYA JIKA BUKAN SPV */}
        {!isSpv ? (
          <form onSubmit={handleCreateJadwal} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4 h-fit">
            <h3 className="font-bold text-sky-400 text-xs uppercase font-mono tracking-wider">Plot Sesi Baru</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nama / Jenis Pelatihan</label>
              <select required value={idPelatihan} onChange={e => setIdPelatihan(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
                <option value="">-- Pilih Jenis --</option>
                {types.map(t => <option key={t.id_pelatihan} value={t.id_pelatihan}>{t.nama_pelatihan}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Trainer</label>
              <select required value={idTrainer} onChange={e => setIdTrainer(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
                <option value="">-- Pilih Trainer --</option>
                {trainers.map(tr => <option key={tr.id_trainer} value={tr.id_trainer}>{tr.nama_trainer}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Lokasi Pelatihan</label>
              <select required value={idLokasi} onChange={e => setIdLokasi(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
                <option value="">-- Pilih Ruang --</option>
                {locations.map(l => <option key={l.id_lokasi} value={l.id_lokasi}>{l.lokasi_pelatihan}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tanggal Pelatihan</label>
              <input type="date" required value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Waktu Mulai</label>
                <input type="time" required value={waktuMulai} onChange={e => setWaktuMulai(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Waktu Selesai</label>
                <input type="time" required value={waktuSelesai} onChange={e => setWaktuSelesai(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Biaya Investasi (Rp)</label>
              <input type="number" required placeholder="Nominal Anggaran" value={biaya} onChange={e => setBiaya(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2.5 rounded-lg font-bold text-sm hover:bg-sky-400 cursor-pointer flex items-center justify-center space-x-1">
              <Plus className="w-4 h-4" /> <span>Rilis Jadwal</span>
            </button>
          </form>
        ) : (
          /* JIKA SPV: Berikan Banner Informasi Read-Only */
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-fit space-y-2">
            <h4 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wide">Akses Pengawas SPV</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anda berada di panel pengawasan jadwal diklat. Anda dapat meninjau rincian sesi, jam pelaksanaan, sisa durasi pelatihan, dan manifest karyawan terdaftar tanpa hak mengubah struktur jadwal.
            </p>
          </div>
        )}

        {/* Tabel Data Master Jadwal */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden h-fit">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-850 text-xs font-mono border-b border-slate-700 text-slate-400 uppercase">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Pelatihan</th>
                  <th className="p-3">Waktu & Durasi</th>
                  <th className="p-3">Biaya</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm text-slate-200">
                {schedules.map(s => (
                  <tr key={s.id_jadwal} className="hover:bg-slate-750/20 transition-colors">
                    <td className="p-3 font-mono text-xs text-slate-500 font-bold">{s.id_jadwal}</td>
                    
                    <td className="p-3">
                      {editingId === s.id_jadwal && !isSpv ? (
                        <select value={editFields.id_pelatihan || ''} onChange={e => setEditFields({...editFields, id_pelatihan: e.target.value})} className="bg-slate-900 text-white p-1 rounded text-xs w-full">
                          {types.map(t => <option key={t.id_pelatihan} value={t.id_pelatihan}>{t.nama_pelatihan}</option>)}
                        </select>
                      ) : (
                        <span className="font-semibold">{s.type_pelatihan?.nama_pelatihan || s.id_pelatihan}</span>
                      )}
                    </td>

                    <td className="p-3 text-xs font-mono">
                      {editingId === s.id_jadwal && !isSpv ? (
                        <div className="space-y-1">
                          <input type="date" value={editFields.tanggal_pelatihan || ''} onChange={e => setEditFields({...editFields, tanggal_pelatihan: e.target.value})} className="bg-slate-900 text-white p-0.5 rounded text-xs block w-full" />
                          <div className="flex space-x-1">
                            <input type="time" value={editFields.waktu_mulai || ''} onChange={e => setEditFields({...editFields, waktu_mulai: e.target.value})} className="bg-slate-900 text-white p-0.5 rounded text-[11px] w-1/2" />
                            <input type="time" value={editFields.waktu_selesai || ''} onChange={e => setEditFields({...editFields, waktu_selesai: e.target.value})} className="bg-slate-900 text-white p-0.5 rounded text-[11px] w-1/2" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{s.tanggal_pelatihan}</p>
                          <p className="text-slate-400 text-[11px]">{s.waktu_mulai?.slice(0,5)}-{s.waktu_selesai?.slice(0,5)} (⏱️ {s.durasi?.slice(0,5)})</p>
                        </>
                      )}
                    </td>

                    <td className="p-3 font-mono text-xs text-emerald-400">
                      {editingId === s.id_jadwal && !isSpv ? (
                        <input type="number" value={editFields.biaya || ''} onChange={e => setEditFields({...editFields, biaya: e.target.value})} className="bg-slate-900 text-white p-1 rounded text-xs w-20" />
                      ) : (
                        `Rp ${Number(s.biaya || 0).toLocaleString('id-ID')}`
                      )}
                    </td>

                    <td className="p-3 text-center">
                      {editingId === s.id_jadwal && !isSpv ? (
                        <div className="flex justify-center space-x-2">
                          <button onClick={() => handleUpdateJadwal(s.id_jadwal)} className="text-emerald-400 hover:text-emerald-500 cursor-pointer"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-2">
                          <button onClick={() => viewAndManagePeserta(s.id_jadwal, s.type_pelatihan?.nama_pelatihan || s.id_pelatihan)} className="text-sky-400 hover:text-sky-300 cursor-pointer" title="Lihat Manifest Karyawan"><Users className="w-4 h-4" /></button>
                          
                          {/* Sembunyikan tombol Edit & Delete khusus untuk akun SPV */}
                          {!isSpv && (
                            <>
                              <button onClick={() => { setEditingId(s.id_jadwal); setEditFields({ ...s, waktu_mulai: s.waktu_mulai?.slice(0,5), waktu_selesai: s.waktu_selesai?.slice(0,5) }); }} className="text-amber-400 hover:text-amber-500 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(s.id_jadwal)} className="text-red-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* POP-UP MODAL INTERAKTIF: REKAP MANIFEST KARYAWAN */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-850 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-sm font-mono text-sky-400">{currentJadwalTitle}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            {/* Form Assign Karyawan Baru: Hanya muncul jika BUKAN SPV */}
            {!isSpv ? (
              <form onSubmit={handleAssignPeserta} className="p-4 bg-slate-900/40 border-b border-slate-700/60 flex items-end space-x-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase font-mono">Pilih Karyawan untuk Dimasukkan Kelas</label>
                  <select required value={selectedPernerToAssign} onChange={e => setSelectedPernerToAssign(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none">
                    <option value="">-- Cari Nama Karyawan --</option>
                    {allPeserta.map(p => <option key={p.perner} value={p.perner}>{p.perner} - {p.nama_peserta}</option>)}
                  </select>
                </div>
                <button type="submit" className="bg-sky-500 text-slate-950 px-4 py-2 rounded-lg font-bold text-xs hover:bg-sky-400 cursor-pointer flex items-center space-x-1 h-fit">
                  <UserPlus className="w-3.5 h-3.5" /> <span>Assign</span>
                </button>
              </form>
            ) : (
              <div className="p-3 bg-slate-900/20 border-b border-slate-700/40 text-[11px] font-mono text-slate-400">
                📌 Daftar manifest karyawan terdaftar di bawah ini bersifat tetap (Read-Only).
              </div>
            )}

            {/* Manifest Karyawan Terdaftar */}
            <div className="p-4 max-h-[350px] overflow-y-auto">
              {loadingPeserta ? (
                <p className="text-xs font-mono text-slate-500 text-center py-4">Sinkronisasi manifest...</p>
              ) : assignedPeserta.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada karyawan ter-assign di dalam sesi ini.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 font-mono text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">PERNER</th>
                      <th className="p-2.5">Nama Karyawan</th>
                      <th className="p-2.5">Posisi</th>
                      {!isSpv && <th className="p-2.5 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-slate-200">
                    {assignedPeserta.map(p => (
                      <tr key={p.perner} className="hover:bg-slate-750/30">
                        <td className="p-2.5 font-mono text-sky-400">{p.perner}</td>
                        <td className="p-2.5 font-semibold">{p.nama_peserta}</td>
                        <td className="p-2.5 text-slate-400">{p.job_position}</td>
                        
                        {/* Kolom Unassign hanya muncul jika BUKAN SPV */}
                        {!isSpv && (
                          <td className="p-2.5 text-center">
                            <button 
                              type="button" 
                              onClick={() => handleRemovePeserta(p.perner)} 
                              className="text-red-400 hover:text-red-500 cursor-pointer font-mono text-[10px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20"
                            >
                              Unassign
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};