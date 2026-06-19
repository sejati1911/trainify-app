import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Library, School, MapPin, Trash2, Edit2, Check, X } from 'lucide-react';

// Memindahkan konfigurasi options ke luar JSX agar aman dari parse error OXC
const K3_OPTIONS = ['K3', 'Non-K3'];
const TIPE_OPTIONS = ['Code of Conduct', 'ISO & Manajemen Mutu', 'Kesehatan', 'Jaminan Halal'];
const KATEGORI_OPTIONS = ['Generic', 'Core', 'Supplementary', 'Specific'];

export const ManajemenMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'type' | 'trainer' | 'tempat'>('type');
  const [loading, setLoading] = useState(false);

  const [types, setTypes] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [tempats, setTempats] = useState<any[]>([]);

  const [idPelatihan, setIdPelatihan] = useState('');
  const [namaPelatihan, setNamaPelatihan] = useState('');
  const [k3, setK3] = useState('K3');
  const [tipe, setTipe] = useState('Code of Conduct');
  const [kategori, setKategori] = useState('Generic');

  const [namaTrainer, setNamaTrainer] = useState('');
  const [asalTrainer, setAsalTrainer] = useState('');
  const [lokasi, setLokasi] = useState('');

  const [editingId, setEditingId] = useState<any>(null);
  const [editFields, setEditFields] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    setEditingId(null);
    if (activeTab === 'type') {
      const { data } = await supabase.from('type_pelatihan').select('*');
      setTypes(data || []);
    } else if (activeTab === 'trainer') {
      const { data } = await supabase.from('data_trainer').select('*');
      setTrainers(data || []);
    } else if (activeTab === 'tempat') {
      const { data } = await supabase.from('tempat_pelatihan').select('*');
      setTempats(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('type_pelatihan').insert([{ 
      id_pelatihan: idPelatihan, nama_pelatihan: namaPelatihan, k3_nonk3: k3, tipe_pelatihan: tipe, kategori_pelatihan: kategori 
    }]);
    if (error) alert(error.message);
    else { setIdPelatihan(''); setNamaPelatihan(''); fetchData(); }
  };

const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    // Menambahkan .select() untuk memastikan data berhasil di-insert
    const { data, error } = await supabase
      .from('data_trainer')
      .insert([{ nama_trainer: namaTrainer, asal_perusahaan: asalTrainer }])
      .select();

    if (error) {
      alert("Gagal menyimpan Trainer: " + error.message);
    } else if (!data || data.length === 0) {
      alert("Data Trainer tidak tersimpan. Periksa RLS atau kecocokan nama kolom di Supabase!");
    } else {
      setNamaTrainer('');
      setAsalTrainer('');
      fetchData();
    }
  };

const handleAddTempat = async (e: React.FormEvent) => {
    e.preventDefault();
    // Menambahkan .select() untuk memastikan data berhasil di-insert
    const { data, error } = await supabase
      .from('tempat_pelatihan')
      .insert([{ lokasi_pelatihan: lokasi }])
      .select();

    if (error) {
      alert("Gagal menyimpan Lokasi: " + error.message);
    } else if (!data || data.length === 0) {
      alert("Data Lokasi tidak tersimpan. Periksa RLS atau kecocokan nama kolom di Supabase!");
    } else {
      setLokasi('');
      fetchData();
    }
  };

  const startEdit = (id: any, currentData: any) => {
    setEditingId(id);
    setEditFields({ ...currentData });
  };

  const handleUpdate = async (table: string, colId: string, id: any) => {
    const { error } = await supabase.from(table).update(editFields).eq(colId, id);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleDelete = async (table: string, col: string, id: any) => {
    if (!confirm('Hapus record master ini?')) return;
    const { error } = await supabase.from(table).delete().eq(col, id);
    if (error) alert('Data terikat dengan tabel jadwal!');
    else fetchData();
  };

  return (
    <div className="p-6 space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold text-sky-400">Manajemen Data Master</h1>
        <p className="text-sm text-slate-400">Konfigurasi parameter dasar pelatihan</p>
      </div>

      <div className="flex border border-slate-700 bg-slate-800 p-1 rounded-xl max-w-lg">
        <button 
          type="button" 
          onClick={() => setActiveTab('type')} 
          className={activeTab === 'type' ? "flex items-center space-x-2 flex-1 justify-center py-2 text-sm font-bold rounded-lg bg-sky-500 text-slate-950 shadow-lg cursor-pointer" : "flex items-center space-x-2 flex-1 justify-center py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white cursor-pointer"}
        >
          <Library className="w-4 h-4" /> <span>Type</span>
        </button>
        <button 
          type="button" 
          onClick={() => setActiveTab('trainer')} 
          className={activeTab === 'trainer' ? "flex items-center space-x-2 flex-1 justify-center py-2 text-sm font-bold rounded-lg bg-sky-500 text-slate-950 shadow-lg cursor-pointer" : "flex items-center space-x-2 flex-1 justify-center py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white cursor-pointer"}
        >
          <School className="w-4 h-4" /> <span>Trainer</span>
        </button>
        <button 
          type="button" 
          onClick={() => setActiveTab('tempat')} 
          className={activeTab === 'tempat' ? "flex items-center space-x-2 flex-1 justify-center py-2 text-sm font-bold rounded-lg bg-sky-500 text-slate-950 shadow-lg cursor-pointer" : "flex items-center space-x-2 flex-1 justify-center py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white cursor-pointer"}
        >
          <MapPin className="w-4 h-4" /> <span>Tempat</span>
        </button>
      </div>

      {loading && <p className="text-sm text-sky-400 animate-pulse font-mono">Menyelaraskan data database...</p>}

      {/* TAB 1: TYPE PELATIHAN */}
      {!loading && activeTab === 'type' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddType} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4 h-fit">
            <h3 className="font-bold text-sky-400 text-sm uppercase font-mono">Tambah Macam Pelatihan</h3>
            <input type="text" required placeholder="ID Pelatihan (contoh : 1)" value={idPelatihan} onChange={e => setIdPelatihan(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
            <input type="text" required placeholder="Nama Pelatihan" value={namaPelatihan} onChange={e => setNamaPelatihan(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
            
            <select value={k3} onChange={e => setK3(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
              {K3_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            
            <select value={tipe} onChange={e => setTipe(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
              {TIPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            
            <select value={kategori} onChange={e => setKategori(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
              {KATEGORI_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            
            <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2 rounded-lg font-bold text-sm cursor-pointer hover:bg-sky-400">Simpan Master Type</button>
          </form>

          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-850 text-xs font-mono border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-3">ID Code</th>
                  <th className="p-3">Nama Pelatihan</th>
                  <th className="p-3">Klasifikasi</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm">
                {types.map(t => (
                  <tr key={t.id_pelatihan} className="hover:bg-slate-750/20">
                    <td className="p-3 font-mono text-sky-400">{t.id_pelatihan}</td>
                    <td className="p-3">
                      {editingId === t.id_pelatihan ? (
                        <input type="text" value={editFields.nama_pelatihan || ''} onChange={e => setEditFields({...editFields, nama_pelatihan: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-1 text-sm w-full text-white" />
                      ) : t.nama_pelatihan}
                    </td>
                    <td className="p-3 text-xs">
                      {editingId === t.id_pelatihan ? (
                        <div className="space-y-1">
                          <select value={editFields.k3_nonk3 || 'K3'} onChange={e => setEditFields({...editFields, k3_nonk3: e.target.value})} className="bg-slate-900 text-white border border-slate-700 rounded p-0.5 text-xs block">
                            {K3_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          <select value={editFields.tipe_pelatihan || ''} onChange={e => setEditFields({...editFields, tipe_pelatihan: e.target.value})} className="bg-slate-900 text-white border border-slate-700 rounded p-0.5 text-xs block">
                            {TIPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300">{t.k3_nonk3}</span>
                          <span className="text-slate-500 font-mono text-xs">{t.tipe_pelatihan}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {editingId === t.id_pelatihan ? (
                        <div className="flex justify-center space-x-2">
                          <button type="button" onClick={() => handleUpdate('type_pelatihan', 'id_pelatihan', t.id_pelatihan)} className="text-emerald-400 hover:text-emerald-500 cursor-pointer"><Check className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-2">
                          <button type="button" onClick={() => startEdit(t.id_pelatihan, t)} className="text-amber-400 hover:text-amber-500 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                          <button type="button" onClick={() => handleDelete('type_pelatihan', 'id_pelatihan', t.id_pelatihan)} className="text-red-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DATA TRAINER */}
      {!loading && activeTab === 'trainer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddTrainer} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4 h-fit">
            <h3 className="font-bold text-sky-400 text-sm uppercase font-mono">Tambah Trainer</h3>
            <input type="text" required placeholder="Nama Trainer" value={namaTrainer} onChange={e => setNamaTrainer(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
            <input type="text" required placeholder="Asal Instansi" value={asalTrainer} onChange={e => setAsalTrainer(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
            <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2 rounded-lg font-bold text-sm hover:bg-sky-400 cursor-pointer">Simpan Trainer</button>
          </form>
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-850 text-xs font-mono border-b border-slate-700 text-slate-400">
                <tr><th className="p-3">ID SEQ</th><th className="p-3">Nama Trainer</th><th className="p-3">Asal Perusahaan</th><th className="p-3 text-center">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm">
                {trainers.map(tr => (
                  <tr key={tr.id_trainer} className="hover:bg-slate-750/20">
                    <td className="p-3 text-slate-500 font-mono text-xs">{tr.id_trainer}</td>
                    <td className="p-3">
                      {editingId === tr.id_trainer ? (
                        <input type="text" value={editFields.nama_trainer || ''} onChange={e => setEditFields({...editFields, nama_trainer: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-1 text-sm text-white w-full" />
                      ) : tr.nama_trainer}
                    </td>
                    <td className="p-3 text-slate-300">
                      {editingId === tr.id_trainer ? (
                        <input type="text" value={editFields.asal_perusahaan || ''} onChange={e => setEditFields({...editFields, asal_perusahaan: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-1 text-sm text-white w-full" />
                      ) : tr.asal_perusahaan || '-'}
                    </td>
                    <td className="p-3 text-center">
                      {editingId === tr.id_trainer ? (
                        <div className="flex justify-center space-x-2">
                          <button type="button" onClick={() => handleUpdate('data_trainer', 'id_trainer', tr.id_trainer)} className="text-emerald-400 hover:text-emerald-500 cursor-pointer"><Check className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-2">
                          <button type="button" onClick={() => startEdit(tr.id_trainer, tr)} className="text-amber-400 hover:text-amber-500 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                          <button type="button" onClick={() => handleDelete('data_trainer', 'id_trainer', tr.id_trainer)} className="text-red-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPAT PELATIHAN */}
      {!loading && activeTab === 'tempat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddTempat} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4 h-fit">
            <h3 className="font-bold text-sky-400 text-sm uppercase font-mono">Tambah Tempat Pelatihan</h3>
            <input type="text" required placeholder="Nama Ruang / Lokasi" value={lokasi} onChange={e => setLokasi(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none" />
            <button type="submit" className="w-full bg-sky-500 text-slate-950 py-2 rounded-lg font-bold text-sm hover:bg-sky-400 cursor-pointer">Simpan Tempat</button>
          </form>
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-850 text-xs font-mono border-b border-slate-700 text-slate-400">
                <tr><th className="p-3">ID SEQ</th><th className="p-3">Lokasi Ruangan</th><th className="text-center">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm">
                {tempats.map(tp => (
                  <tr key={tp.id_lokasi} className="hover:bg-slate-750/20">
                    <td className="p-3 text-slate-500 font-mono text-xs">{tp.id_lokasi}</td>
                    <td className="p-3 font-semibold text-slate-200">
                      {editingId === tp.id_lokasi ? (
                        <input type="text" value={editFields.lokasi_pelatihan || ''} onChange={e => setEditFields({...editFields, lokasi_pelatihan: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-1 text-sm text-white w-full" />
                      ) : tp.lokasi_pelatihan}
                    </td>
                    <td className="p-3 text-center">
                      {editingId === tp.id_lokasi ? (
                        <div className="flex justify-center space-x-2">
                          <button type="button" onClick={() => handleUpdate('tempat_pelatihan', 'id_lokasi', tp.id_lokasi)} className="text-emerald-400 hover:text-emerald-500 cursor-pointer"><Check className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-2">
                          <button type="button" onClick={() => startEdit(tp.id_lokasi, tp)} className="text-amber-400 hover:text-amber-500 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                          <button type="button" onClick={() => handleDelete('tempat_pelatihan', 'id_lokasi', tp.id_lokasi)} className="text-red-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};