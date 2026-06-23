import React, { useEffect, useRef } from 'react';
import { useRive } from '@rive-app/react-canvas';

/**
 * LoginMascot
 * ------------------------------------------------------------------
 * Maskot doodle mata di halaman Login, didukung oleh Rive State
 * Machine "eye-stateMachine" (file: eye-animation-machine.riv).
 *
 * PENEMPATAN FILE .riv — PENTING:
 * File ini diletakkan di folder public/rive/ (BUKAN src/assets/),
 * lalu dirujuk lewat path absolut '/rive/eye-animation-machine.riv'.
 *
 * Alasan: project ini memakai Vite 8 dengan bundler Rolldown. Saat
 * file .riv diimpor sebagai module dari dalam src/ (mis. via
 * `import x from './file.riv'`), Rolldown mencoba membaca isinya
 * sebagai teks/UTF-8 sebelum asset-plugin Vite turun tangan, dan
 * build gagal dengan error "stream did not contain valid UTF-8" —
 * meski assetsInclude sudah diset di vite.config.ts. Ini adalah
 * known quirk Rolldown untuk binary non-JS yang diimpor dari src/.
 *
 * File di folder public/ TIDAK pernah melalui proses bundling sama
 * sekali (baik dev server maupun production build) — Vite hanya
 * men-copy-nya apa adanya ke root output dan men-serve-nya sebagai
 * static file. Ini cara paling aman untuk aset binary seperti .riv,
 * dan berlaku sama di semua versi Vite.
 *
 * STRUKTUR STATE MACHINE (terverifikasi dari isi file):
 *   - State machine: "eye-stateMachine"
 *   - Hit area: "HoverArea" — area di artboard yang dipantau listener
 *   - Listener: "Pointer Enter" / "Pointer Exit" pada HoverArea,
 *     otomatis mengubah input boolean "Hovering" + trigger "FireLook"
 *   - State arah pandang & animasi kedip sudah diwire di dalam file,
 *     tidak perlu didorong manual dari kode.
 *
 * MODE FULL-SCREEN FOLLOW CURSOR:
 * HoverArea bersifat enter/exit (bukan tracking koordinat kontinu),
 * jadi supaya mata bisa "mengikuti" kursor ke mana pun di layar
 * (bukan hanya saat kursor tepat di atas elemen mascot), pendekatan
 * yang dipakai adalah MENGGERAKKAN ELEMEN MASCOT ITU SENDIRI secara
 * halus mengejar posisi kursor (parallax-style), bukan mendorong
 * koordinat ke dalam state machine. Karena posisi mascot selalu
 * dekat kursor, HoverArea di dalamnya tetap aktif ter-hover sehingga
 * animasi mata & kedip tetap berjalan.
 */

const RIVE_SRC = '/rive/eye-animation-machine.riv';
const STATE_MACHINE_NAME = 'eye-stateMachine';

interface LoginMascotProps {
  className?: string;
  /** Jika true, mascot mengikuti kursor ke seluruh layar (fixed + translate). */
  followCursor?: boolean;
  /** Seberapa cepat mascot mengejar kursor, 0..1. Default 0.15 (halus). */
  followEase?: number;
}

export const LoginMascot: React.FC<LoginMascotProps> = ({
  className = '',
  followCursor = false,
  followEase = 0.15,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Posisi target (kursor) dan posisi saat ini (untuk easing halus)
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);
  const rafId = useRef<number | null>(null);

  const { RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    // Jika file .riv gagal dimuat, jangan lempar error ke layar —
    // cukup biarkan area maskot kosong (tidak mematahkan halaman).
    onLoadError: () => {
      // sengaja dibiarkan kosong (silent fallback)
    },
  });

  useEffect(() => {
    if (!followCursor) return;
    const el = wrapperRef.current;
    if (!el) return;

    const handlePointerMove = (e: PointerEvent) => {
      const half = el.offsetWidth / 2;
      targetPos.current = { x: e.clientX - half, y: e.clientY - half };
      if (!initialized.current) {
        // Posisikan langsung di lokasi kursor pada interaksi pertama,
        // tanpa animasi "terbang" dari pojok 0,0.
        currentPos.current = { ...targetPos.current };
        el.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
        initialized.current = true;
      }
    };

    const animate = () => {
      const cur = currentPos.current;
      const tgt = targetPos.current;
      cur.x += (tgt.x - cur.x) * followEase;
      cur.y += (tgt.y - cur.y) * followEase;
      el.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [followCursor, followEase]);

  if (followCursor) {
    return (
      <div
        ref={wrapperRef}
        className={`pointer-events-none select-none fixed left-0 top-0 z-50 h-24 w-24 ${className}`}
        aria-hidden="true"
      >
        <RiveComponent style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  return (
    <div className={`select-none ${className}`} aria-hidden="true">
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default LoginMascot;
