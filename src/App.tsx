import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { SidebarLayout } from './components/SidebarLayout';
import { Login } from './pages/Login';

// 1. IMPOR HALAMAN OPERASIONAL ADMIN
import { DashboardAdmin } from './pages/DashboardAdmin';
import { DataPeserta } from './pages/DataPeserta';
import { ManajemenMaster } from './pages/ManajemenMaster';
import { JadwalPelatihan } from './pages/JadwalPelatihan';
import { ManajemenPenilaian } from './pages/ManajemenPenilaian';
import { UserSettings } from './pages/UserSettings';

// 2. IMPOR HALAMAN OPERASIONAL USER / KARYAWAN
import { DashboardUser } from './pages/DashboardUser';
import { JadwalUser } from './pages/JadwalUser';
import { HasilPenilaianUser } from './pages/HasilPenilaianUser';

// 3. KOMPONEN DARURAT RIWAYAT (Ambil langsung atau buat draf lokal jika file belum ada)
// Jika Anda punya file RiwayatUser.tsx atau RiwayatPelatihan.tsx, silakan ganti baris di bawah ini dengan impor normal.
const RiwayatPelatihanFallback: React.FC = () => (
  <div className="p-6 text-slate-400 font-mono text-xs">
    Halaman Monitoring Riwayat Pelatihan Karyawan.
  </div>
);

export const App: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [activePage, setActivePage] = useState<string>('dashboardAdmin');

  // Menentukan routing default awal pasca-login berdasarkan role akun
  useEffect(() => {
    if (user) {
      setActivePage(user.role === 'admin' ? 'dashboardAdmin' : 'dashboardUser');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center text-slate-400 font-mono text-xs">
        Menginisialisasi otentikasi Trainify...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Router internal pemetaan menu sidebar menuju render halaman utama
  const renderContent = () => {
    switch (activePage) {
      // BLOK NAVIGASI SISI ADMIN
      case 'dashboardAdmin': return <DashboardAdmin />;
      case 'peserta':        return <DataPeserta />;
      case 'master':         return <ManajemenMaster />;
      case 'jadwal':         return <JadwalPelatihan />;
      case 'penilaian':      return <ManajemenPenilaian />;
      case 'settings':       return <UserSettings />;

      // BLOK NAVIGASI SISI USER / KARYAWAN BIASA
      case 'dashboardUser':  return <DashboardUser />;
      case 'jadwalUser':     return <JadwalUser />;
      case 'riwayat':        return <RiwayatPelatihanFallback />;
      case 'kelulusan':      return <HasilPenilaianUser />;

      default:
        return <div className="p-6 font-mono text-xs text-slate-500">Halaman tidak ditemukan.</div>;
    }
  };

  return (
    <SidebarLayout 
      activePage={activePage} 
      setActivePage={setActivePage} 
      user={user} 
      logout={logout}
    >
      {renderContent()}
    </SidebarLayout>
  );
};