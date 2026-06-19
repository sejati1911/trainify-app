import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import bcrypt from 'bcryptjs'; // <-- Impor bcrypt untuk komparasi hash aman

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Ambil baris data berdasarkan username saja
      const { data, error } = await supabase
        .from('access_login')
        .select('username, role, perner, password')
        .eq('username', username)
        .maybeSingle(); // Menggunakan maybeSingle agar tidak crash jika row kosong

      if (error || !data) throw new Error('Username tidak ditemukan.');

      // 2. Bandingkan password plaintext dari form dengan password hash dari DB
      const isPasswordMatch = await bcrypt.compare(password, data.password);
      if (!isPasswordMatch) throw new Error('Password salah.');

      // 3. Eksekusi login context jika validasi lolos
      login({ username: data.username, role: data.role, perner: data.perner });
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-8 shadow-2xl border border-slate-700">
        <h2 className="text-center text-3xl font-extrabold text-sky-400 mb-2">Trainify</h2>
        <p className="text-center text-sm text-slate-400 mb-6">Training Tracking System</p>
        
        {errorMsg && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-sm text-red-400">
            {errorMsg}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="text" 
            placeholder="Username" 
            required 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-sm focus:outline-none focus:border-sky-500" 
          />
          <input 
            type="password" 
            placeholder="Password" 
            required 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-sm focus:outline-none focus:border-sky-500" 
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full rounded-lg bg-sky-500 p-2.5 font-semibold text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};