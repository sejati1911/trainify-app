import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext'; // <-- Impor Hook Tema Global
import {
  Library, Calendar, Award, Settings, LogOut,
  LayoutDashboard, Users, Sun, Moon, Menu, X, History
} from 'lucide-react';
import trainifyLogo from '../assets/logo.png';

interface SidebarLayoutProps {
  activePage: string;
  setActivePage: (page: string) => void;
  user: any;
  logout: () => void;
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  activePage,
  setActivePage,
  user,
  logout,
  children
}) => {
  const { isDarkMode, toggleTheme } = useTheme(); // <-- Destrukturisasi State Tema
  const [isMobileOpen, setIsMobileOpen] = useState(false); // <-- State collapse sidebar di mobile

  // Ambil role secara aman dan konversi ke lowercase
  const currentRole = user && user.role ? String(user.role).toLowerCase() : 'user';

  const isAdmin = currentRole === 'admin';
  const isSpv = currentRole === 'spv';
  const isUser = currentRole === 'user';

  // Helper styling adaptif untuk tombol menu navigasi
  const linkStyle = (pageName: string) => {
    const isSelected = activePage === pageName;
    return `w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
      isSelected
        ? 'bg-sky-500 text-slate-950 font-bold shadow-lg shadow-sky-500/10'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
    }`;
  };

  // Setiap navigasi via menu pada mode mobile otomatis menutup sidebar
  const navigateTo = (pageName: string) => {
    setActivePage(pageName);
    setIsMobileOpen(false);
  };

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen font-sans antialiased text-slate-800 dark:text-slate-200 transition-colors duration-300">

      {/* TOMBOL HAMBURGER: hanya tampak di mobile (md:hidden), fixed di pojok kiri atas */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className={`md:hidden fixed top-4 left-4 z-30 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 
               hover:bg-sky-100 dark:hover:bg-slate-400  cursor-pointer
          shadow-md transition-opacity ${isMobileOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Buka menu navigasi"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* OVERLAY GELAP: hanya muncul di mobile saat sidebar terbuka, klik untuk menutup */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30 "
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR CONTAINER: fixed + translate di mobile (collapse), static di desktop (md:) */}
      <aside
        className={`w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-4 fixed md:sticky top-0 left-0 shrink-0 z-40 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >

        <div className="space-y-5 overflow-y-auto pr-1">
          <div className="px-2 py-1 flex items-center justify-between">  
          <div>
            {/* SPACE LOGO: letakkan logo perusahaan di sini, di atas judul Trainify */}
              
              <div className="flex items-center justify-center">
                  <img
                    src={trainifyLogo}
                    alt="Trainify Logo"
                    className=" h-18 w-auto object-contain
                                transition-all duration-300
                                hover:scale-105
                                dark:hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                  />
              </div>
                <h2 className="text-center text-xl font-black tracking-wider text-sky-500 dark:text-sky-400">
                  TRAINIFY
                </h2>

                <p className="text-center text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Training Activity Tracker
                </p>
          </div>
            
            {/* TOMBOL TUTUP: hanya tampak di mobile, sejajar dengan judul */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              aria-label="Tutup menu navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {/* ==================== 1. GRUP MENU ADMIN ==================== */}
            {isAdmin && (
              <>
                <div className="px-2 py-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Otoritas Master Admin</div>
                <button onClick={() => navigateTo('dashboardAdmin')} className={linkStyle('dashboardAdmin')}>
                  <LayoutDashboard className="w-4 h-4" /> <span>Dashboard Admin</span>
                </button>
                <button onClick={() => navigateTo('peserta')} className={linkStyle('peserta')}>
                  <Users className="w-4 h-4" /> <span>Data Peserta</span>
                </button>
                <button onClick={() => navigateTo('master')} className={linkStyle('master')}>
                  <Library className="w-4 h-4" /> <span>Manajemen Master</span>
                </button>
                <button onClick={() => navigateTo('jadwal')} className={linkStyle('jadwal')}>
                  <Calendar className="w-4 h-4" /> <span>Jadwal Pelatihan</span>
                </button>
                <button onClick={() => navigateTo('penilaian')} className={linkStyle('penilaian')}>
                  <Award className="w-4 h-4" /> <span>Manajemen Penilaian</span>
                </button>
                <button onClick={() => navigateTo('riwayat')} className={linkStyle('riwayat')}>
                  <History className="w-4 h-4" /> <span>Riwayat Pelatihan</span>
                </button>
              </>
            )}

            {/* ==================== 2. GRUP MENU SUPERVISOR (SPV) ====================
                SPV kini setara Admin untuk operasional CRUD, KECUALI Manajemen Master
                yang tetap eksklusif untuk Admin (tidak ada tombolnya di sini). */}
            {isSpv && (
              <>
                <div className="px-2 py-2 text-[10px] font-mono text-amber-600 dark:text-amber-500 uppercase tracking-wider">Akses Supervisor</div>
                <button onClick={() => navigateTo('dashboardAdmin')} className={linkStyle('dashboardAdmin')}>
                  <LayoutDashboard className="w-4 h-4" /> <span>Dashboard</span>
                </button>
                <button onClick={() => navigateTo('peserta')} className={linkStyle('peserta')}>
                  <Users className="w-4 h-4" /> <span>Data Peserta</span>
                </button>
                <button onClick={() => navigateTo('jadwal')} className={linkStyle('jadwal')}>
                  <Calendar className="w-4 h-4" /> <span>Jadwal Pelatihan</span>
                </button>
                <button onClick={() => navigateTo('penilaian')} className={linkStyle('penilaian')}>
                  <Award className="w-4 h-4" /> <span>Manajemen Penilaian</span>
                </button>
                <button onClick={() => navigateTo('riwayat')} className={linkStyle('riwayat')}>
                  <History className="w-4 h-4" /> <span>Riwayat Pelatihan</span>
                </button>
              </>
            )}

            {/* ==================== 3. GRUP MENU USER / KARYAWAN ====================
                Riwayat Pelatihan dipindahkan ke Admin/SPV; karyawan hanya menyisakan Hasil Penilaian. */}
            {isUser && (
              <>
                <div className="px-2 py-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Akses Karyawan</div>
                <button onClick={() => navigateTo('dashboardUser')} className={linkStyle('dashboardUser')}>
                  <LayoutDashboard className="w-4 h-4" /> <span>Dashboard User</span>
                </button>
                <button onClick={() => navigateTo('jadwalUser')} className={linkStyle('jadwalUser')}>
                  <Calendar className="w-4 h-4" /> <span>Jadwal Pelatihan</span>
                </button>
                <button onClick={() => navigateTo('kelulusan')} className={linkStyle('kelulusan')}>
                  <Award className="w-4 h-4" /> <span>Hasil Penilaian</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* CONTROLLER SEKTOR BAWAH */}
        <div className="space-y-3.5 pt-3 border-t border-slate-200 dark:border-slate-800/80">

          {/* 🌟 FITUR INTERAKTIF SAKLAR LIGHT / DARK MODE */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
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

          {/* Menu pengaturan pengguna (hanya bisa diakses oleh Master Admin) */}
          {isAdmin && (
            <button
              onClick={() => navigateTo('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activePage === 'settings'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" /> <span>User Settings</span>
            </button>
          )}

          {/* Informasi Identitas Login Terkini */}
          <div className="p-3 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-3 transition-colors duration-300">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-sky-600 dark:text-sky-400 font-mono border border-slate-300 dark:border-slate-700">
                {user?.username?.slice(0, 2) || 'US'}
              </div>
              <div className="overflow-hidden">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-tighter">Role: {currentRole}</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate font-mono">{user?.username || 'Guest'}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 text-[11px] font-bold py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer border border-red-500/20 shadow-sm"
            >
              <LogOut className="w-3 h-3" /> <span>Logout</span>
            </button>
          </div>
        </div>

      </aside>

      {/* RENDER VIEWPORT: padding-top ekstra di mobile agar tidak tertutup tombol hamburger fixed */}
      <main className="flex-1 min-h-screen overflow-y-auto w-full md:ml-0 pt-16 md:pt-0 flex flex-col">
        <div className="flex-1">
          {children}
        </div>

        {/* FOOTER GLOBAL: tampil di setiap halaman karena SidebarLayout membungkus seluruh konten */}
        <footer className="w-full p-4 text-center text-[11px] font-mono text-slate-400">
          <div className="flex flex-col items-center">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              © 2026 Created by
            </span>

            <span
              className="
                mt-2
                text-lg font-black
                tracking-[0.5em]
                text-sky-500 dark:text-sky-300
                drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]
                transition-all duration-300
                hover:scale-105
              "
            >
              TEAM 4
            </span>
          </div>
        </footer>
      </main>

    </div>
  );
};
