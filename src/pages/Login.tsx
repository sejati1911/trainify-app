import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import bcrypt from 'bcryptjs';
import trainifyLogo from '../assets/logo.png';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { LoginMascot } from '../components/LoginMascot';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      // 1. Ambil SEMUA data login untuk dicocokkan di sisi klien agar kebal Case-Sensitive
      const { data: allUsers, error } = await supabase
        .from('access_login')
        .select('username, role, perner, password');

      if (error || !allUsers) throw new Error('Gagal terhubung ke server database.');

      // 2. Cari user dengan mengabaikan huruf besar/kecil (case-insensitive)
      const data = allUsers.find(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
      );

      if (!data) throw new Error('Username tidak ditemukan.');

      const dbPassword = data.password ? data.password.trim() : '';

      // 3. Verifikasi Keamanan Berlapis (Plaintext ATAU Bcrypt)
      // CATATAN: jalur toleransi darurat hardcode (AD1210 / testadmin123) sudah DIHAPUS
      // karena merupakan backdoor berbahaya. Fallback plaintext dipertahankan sementara
      // hanya untuk akun lama yang passwordnya belum di-hash ulang lewat User Settings.
      let isPasswordMatch = (cleanPassword === dbPassword);

      if (!isPasswordMatch && dbPassword.startsWith('$2')) {
        try {
          isPasswordMatch = await bcrypt.compare(cleanPassword, dbPassword);
        } catch {
          isPasswordMatch = false;
        }
      }

      if (!isPasswordMatch) throw new Error('Password salah.');

      // 4. Eksekusi login context jika validasi lolos
      login({ username: data.username, role: data.role, perner: data.perner });
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-sky-50 dark:bg-slate-900 px-4 text-slate-800 dark:text-white transition-colors duration-300">
      {/* MASKOT DOODLE: mata mengikuti kursor ke seluruh layar */}
      <LoginMascot followCursor />

      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-2xl border border-sky-200 dark:border-slate-700">
        {/* SPACE LOGO: letakkan logo perusahaan di sini, di atas judul Trainify */}
        <div className="flex items-center justify-center rounded-lg  font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <img
                    src={trainifyLogo}
                    alt="Trainify Logo"
                    className=" h-24 w-auto object-contain
                                transition-all duration-300
                                hover:scale-105
                                dark:hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                  />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-sky-400 mb-2">Trainify</h2>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">Training Tracking System</p>

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
            className="w-full rounded-lg bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 p-2.5 text-sm focus:outline-none focus:border-sky-500"
          />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 p-2.5 pr-12 text-sm focus:outline-none focus:border-sky-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 p-2.5 font-semibold text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* Keterangan pendaftaran akun */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-5">
          Belum punya akun? Hubungi admin unit Anda untuk pendaftaran.
        </p>

        {/* Saklar Dark / Light Mode di halaman login */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 mt-4 rounded-lg text-xs font-semibold tracking-wide bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            {isDarkMode ? (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono">Light Mode</span>
              </>
            )}
          </div>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 ${isDarkMode ? 'bg-sky-500' : 'bg-slate-300'}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${isDarkMode ? 'translate-x-3' : 'translate-x-0'}`}></div>
          </div>
        </button>
      </div>

      {/* FOOTER GLOBAL: halaman Login berada di luar SidebarLayout, sehingga footer ditambahkan terpisah di sini */}
      <footer className="absolute bottom-0 w-full p-4 text-center text-[11px] font-mono text-slate-400 dark:text-slate-500">
        MASUKKAN FOOTER DI SINI
      </footer>
    </div>
  );
};
