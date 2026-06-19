import React, { createContext, useContext, useState, useEffect } from 'react';

// Representasi struktur data user dari tabel access_login & data_peserta
interface UserSession {
  username: string;
  role: string | null;
  perner: string | null;
}

interface AuthContextType {
  user: UserSession | null;
  login: (userData: UserSession) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Mengecek apakah sesi login tersimpan di Local Storage saat aplikasi pertama dimuat
  useEffect(() => {
    const savedUser = localStorage.getItem('trainify_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem('trainify_session', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('trainify_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook agar context mudah dipanggil di komponen lain
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};