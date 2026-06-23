import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RefreshCw, Search, ShieldCheck, Hourglass, ChevronDown, Clock, Download } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrainingRow {
  id_hasil: number;
  id_jadwal: number;
  nilai_pretest: number | null;
  nilai_posttest: number | null;
  nilai_akhir: number | null;
  status: string | null;
  is_verified: boolean;
  data_peserta?: { perner: string; nama_peserta: string } | null;
  jadwal_pelatihan?: {
    tanggal_pelatihan: string;
    durasi_jam?: string | null;   // time without time zone, format "HH:MM:SS"
    type_pelatihan?: { nama_pelatihan: string } | null;
  } | null;
}

interface JamSummary {
  perner: string;
  nama_peserta: string;
  total_jam: number;
  jumlah_sesi: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Konversi "HH:MM:SS" (kolom time) menjadi desimal jam, misal "02:30:00" -> 2.5
const parseDurasiToJam = (durasi: string | null | undefined): number => {
  if (!durasi) return 0;
  const [h, m, s] = durasi.split(':').map(Number);
  return (h || 0) + (m || 0) / 60 + (s || 0) / 3600;
};

// Format desimal jam jadi label rapi, misal 2.5 -> "2j 30m"
const formatJam = (jam: number): string => {
  const h = Math.floor(jam);
  const m = Math.round((jam - h) * 60);
  return m > 0 ? `${h}j ${m}m` : `${h} jam`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export const RiwayatPelatihan: React.FC = () => {
  const [history, setHistory]         = useState<TrainingRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterYear, setFilterYear]   = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [showSummary, setShowSummary] = useState(false);

  const fetchAllHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hasil_pelatihan')
        .select(`
          id_hasil, id_jadwal, nilai_pretest, nilai_posttest, nilai_akhir, status, is_verified,
          data_peserta (perner, nama_peserta),
          jadwal_pelatihan (tanggal_pelatihan, durasi_jam:durasi, type_pelatihan (nama_pelatihan))
        `)
        .order('id_hasil', { ascending: false });

      if (error) throw error;
      setHistory((data as unknown as TrainingRow[]) || []);
    } catch (err) {
      console.error('Gagal mengambil riwayat pelatihan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllHistory(); }, []);

  const periodFiltered = history.filter((row) => {
    const tgl = row.jadwal_pelatihan?.tanggal_pelatihan;
    if (!tgl) return !filterYear && !filterMonth;
    const d = new Date(tgl);
    if (filterYear  && String(d.getFullYear()) !== filterYear)  return false;
    if (filterMonth && String(d.getMonth() + 1).padStart(2,'0') !== filterMonth) return false;
    return true;
  });

  const filteredHistory = periodFiltered.filter((row) => {
    if (!search.trim()) return true;
    const kw        = search.trim().toLowerCase();
    const nama      = String(row.data_peserta?.nama_peserta || '').toLowerCase();
    const perner    = String(row.data_peserta?.perner || '').toLowerCase();
    const pelatihan = String(row.jadwal_pelatihan?.type_pelatihan?.nama_pelatihan || '').toLowerCase();
    return nama.includes(kw) || perner.includes(kw) || pelatihan.includes(kw);
  });

  const jamSummary: JamSummary[] = Object.values(
    periodFiltered.reduce<Record<string, JamSummary>>((acc, row) => {
      const perner = row.data_peserta?.perner ?? 'unknown';
      const nama   = row.data_peserta?.nama_peserta ?? '-';
      const jam = parseDurasiToJam(row.jadwal_pelatihan?.durasi_jam);
      if (!acc[perner]) acc[perner] = { perner, nama_peserta: nama, total_jam: 0, jumlah_sesi: 0 };
      acc[perner].total_jam    += jam;
      acc[perner].jumlah_sesi += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total_jam - a.total_jam);

  const totalJamKeseluruhan = formatJam(jamSummary.reduce((s, r) => s + r.total_jam, 0));

  const activePeriod = [
    filterMonth ? MONTHS[Number(filterMonth) - 1] : '',
    filterYear  ? filterYear : '',
  ].filter(Boolean).join(' ') || 'Semua Periode';

const handleCetakLaporan = () => {
  const printDate = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

  const byJadwal: Record<number, TrainingRow[]> = {};
  filteredHistory.forEach(row => {
    const key = row.id_jadwal;
    if (!byJadwal[key]) byJadwal[key] = [];
    byJadwal[key].push(row);
  });

  const rekapJamBlock = showSummary && jamSummary.length > 0 ? `
  <div style="margin-bottom:32px;page-break-inside:avoid;">
    <h2 style="font-size:13px;font-weight:700;margin-bottom:10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;">
      Rekap Total Jam Pelatihan per Peserta — ${activePeriod}
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #d1d5db;color:#6b7280;font-weight:600;width:5%;">#</th>
          <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #d1d5db;color:#6b7280;font-weight:600;width:20%;">PERNER</th>
          <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #d1d5db;color:#6b7280;font-weight:600;">Nama Peserta</th>
          <th style="padding:7px 8px;text-align:center;border-bottom:2px solid #d1d5db;color:#6b7280;font-weight:600;width:15%;">Jumlah Sesi</th>
          <th style="padding:7px 8px;text-align:center;border-bottom:2px solid #d1d5db;color:#6b7280;font-weight:600;width:15%;">Total Jam</th>
        </tr>
      </thead>
      <tbody>
        ${jamSummary.map((r, i) => `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:6px 8px;color:#9ca3af;">${i + 1}</td>
            <td style="padding:6px 8px;font-family:monospace;">${r.perner}</td>
            <td style="padding:6px 8px;font-weight:500;">${r.nama_peserta}</td>
            <td style="padding:6px 8px;text-align:center;">${r.jumlah_sesi} sesi</td>
            <td style="padding:6px 8px;text-align:center;font-weight:700;">${formatJam(r.total_jam)}</td>
          </tr>
        `).join('')}
        <tr style="background:#f3f4f6;font-weight:600;">
          <td colspan="3" style="padding:7px 8px;">Total Keseluruhan</td>
          <td style="padding:7px 8px;text-align:center;">${jamSummary.reduce((s, r) => s + r.jumlah_sesi, 0)} sesi</td>
          <td style="padding:7px 8px;text-align:center;">${totalJamKeseluruhan}</td>
        </tr>
        </tbody>
    </table>
  </div>
  <hr style="margin-bottom:24px;border:none;border-top:2px solid #e5e7eb;" />
  ` : '';

  const jadwalBlocks = Object.entries(byJadwal).map(([idJadwal, rows]) => {
    const first = rows[0];
    const tgl = first.jadwal_pelatihan?.tanggal_pelatihan ?? '-';
    const durasiBagian = (first.jadwal_pelatihan?.durasi_jam ?? '').split(':');
    const durasi = durasiBagian.length >= 2
      ? `${durasiBagian[0].padStart(2,'0')}:${durasiBagian[1].padStart(2,'0')}:00`
      : '-';
    const namaPelatihan = first.jadwal_pelatihan?.type_pelatihan?.nama_pelatihan ?? `Sesi ${idJadwal}`;
    const hadir = rows.filter(r => r.status === 'Lulus' || r.is_verified).length;
    const tidakHadir = rows.length - hadir;

    const pesertaRows = rows.map(r => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${r.data_peserta?.perner ?? '-'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${r.data_peserta?.nama_peserta ?? '-'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">
          ${r.is_verified
            ? '<span style="color:#10b981;font-weight:600;">✔ Hadir</span>'
            : r.status === 'Lulus'
              ? '<span style="color:#10b981;font-weight:600;">✔ Lulus</span>'
              : '<span style="color:#f59e0b;font-weight:600;">– Pending</span>'}
        </td>
      </tr>
    `).join('');

    return `
      <div style="margin-bottom:32px;page-break-inside:avoid;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:12px;">
          <tr>
            <td style="width:30%;font-weight:600;padding:3px 0;">Nama Pelatihan</td>
            <td style="width:2%;">:</td>
            <td>${namaPelatihan}</td>
            <td style="width:20%;font-weight:600;">Tanggal</td>
            <td style="width:2%;">:</td>
            <td style="width:20%;">${tgl}</td>
            <td style="width:10%;font-weight:600;">Lokasi</td>
            <td style="width:2%;">:</td>
            <td>-</td>
          </tr>
          <tr>
            <td style="font-weight:600;padding:3px 0;">Waktu</td>
            <td>:</td>
            <td>-</td>
            <td style="font-weight:600;">Durasi</td>
            <td>:</td>
            <td>${durasi}</td>
            <td style="font-weight:600;">Biaya</td>
            <td>:</td>
            <td>Rp 0</td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #d1d5db;color:#6b7280;font-weight:600;width:20%;">Perner</th>
              <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #d1d5db;color:#6b7280;font-weight:600;">Nama Peserta</th>
              <th style="padding:7px 8px;text-align:center;border-bottom:2px solid #d1d5db;color:#6b7280;font-weight:600;width:25%;">Status Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0
              ? '<tr><td colspan="3" style="padding:10px 8px;text-align:center;color:#9ca3af;">Belum ada peserta</td></tr>'
              : pesertaRows}
          </tbody>
        </table>
        <div style="margin-top:6px;font-size:11px;color:#6b7280;">
          Total: ${rows.length} peserta | Hadir: ${hadir} | Tidak Hadir: ${tidakHadir} | Terdaftar: ${rows.length}
        </div>
        <hr style="margin-top:16px;border:none;border-top:1px solid #e5e7eb;" />
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Laporan Jadwal Pelatihan</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; }
        @media print { @page { margin: 16mm 14mm; } }
        .header-top { display:flex; justify-content:space-between; font-size:10px; color:#6b7280; margin-bottom:20px; }
        .report-title { text-align:center; margin-bottom:6px; }
        .report-title h1 { font-size:16px; font-weight:700; }
        .report-title p { font-size:11px; color:#6b7280; }
        .content { margin-top:20px; }
      </style>
    </head>
    <body>
      <div class="header-top">
        <span>${printDate}</span>
        <span>Laporan Jadwal Pelatihan</span>
      </div>
      <div class="report-title">
        <h1>Laporan Jadwal Pelatihan</h1>
        <p>Dicetak pada: ${printDate} &nbsp;|&nbsp; Periode: ${activePeriod}</p>
      </div>
      <div class="content">
        ${rekapJamBlock}
        ${jadwalBlocks.length > 0 ? jadwalBlocks : '<p style="text-align:center;color:#9ca3af;margin-top:40px;">Tidak ada data untuk dicetak.</p>'}
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
};

  return (
    <div className="p-6 space-y-5 text-slate-800 dark:text-white">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Riwayat Pelatihan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Rekap pelatihan seluruh karyawan &mdash;{' '}
            <span className="text-sky-400 font-medium">{activePeriod}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSummary(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              showSummary
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-sky-200 dark:border-slate-700 hover:border-sky-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Rekap Jam
          </button>
          
          <button
              onClick={handleCetakLaporan}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 border border-sky-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Cetak Laporan
            </button>

          
          <button
            onClick={fetchAllHistory}
            className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-sky-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2.5 text-sm text-slate-700 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="">Semua Tahun</option>
            {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2.5 text-sm text-slate-700 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="">Semua Bulan</option>
            {MONTHS.map((m, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {(filterYear || filterMonth) && (
          <button
            onClick={() => { setFilterYear(''); setFilterMonth(''); }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
          >
            Reset filter
          </button>
        )}

        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama, PERNER, atau pelatihan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full min-w-[240px] bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

        {/* Rekap Total Jam */}
        {showSummary && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-slate-700 overflow-hidden mb-5">
            <div className="px-4 py-3 bg-sky-100 dark:bg-slate-900 border-b border-sky-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold text-sky-400">Rekap Total Jam Pelatihan per Peserta</span>
                <span className="text-xs text-slate-400">— {activePeriod}</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Total keseluruhan: <span className="text-sky-400 font-bold">{totalJamKeseluruhan} jam</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-sky-200 dark:bg-slate-900 text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="p-3 pl-4">#</th>
                    <th className="p-3">PERNER</th>
                    <th className="p-3">Nama Peserta</th>
                    <th className="p-3 text-center">Jumlah Sesi</th>
                    <th className="p-3 text-center">Total Jam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                  {jamSummary.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-5 text-center text-slate-400">
                        Tidak ada data untuk periode ini.
                      </td>
                    </tr>
                  ) : jamSummary.map((r, i) => (
                    <tr key={r.perner} className="hover:bg-sky-50/50 dark:hover:bg-slate-500/50 transition-colors">
                      <td className="p-3 pl-4 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="p-3 font-mono text-xs text-sky-400">{r.perner}</td>
                      <td className="p-3 font-medium">{r.nama_peserta}</td>
                      <td className="p-3 text-center font-mono text-xs">{r.jumlah_sesi} sesi</td>
                      <td className="p-3 text-center font-mono font-bold text-sky-400">{formatJam(r.total_jam)}</td>
                    </tr>
                  ))}
                </tbody>
                {jamSummary.length > 0 && (
                  <tfoot>
                    <tr className="bg-sky-100 dark:bg-slate-900 border-t border-sky-200 dark:border-slate-600">
                      <td colSpan={3} className="p-3 pl-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Total Keseluruhan
                      </td>
                      <td className="p-3 text-center font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                        {jamSummary.reduce((s, r) => s + r.jumlah_sesi, 0)} sesi
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-sky-400">
                        {totalJamKeseluruhan} jam
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Tabel utama */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky-200 dark:bg-slate-900 text-xs font-mono border-b border-sky-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Karyawan</th>
                  <th className="p-4">Pelatihan</th>
                  <th className="p-4 text-center">Durasi</th>
                  <th className="p-4 text-center">Pre-Test</th>
                  <th className="p-4 text-center">Post-Test</th>
                  <th className="p-4 text-center">Nilai Akhir</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100 dark:divide-slate-700 text-sm text-slate-700 dark:text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 dark:text-slate-500 font-mono">
                      Menyusun riwayat kompetensi...
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 dark:text-slate-500">
                      {search
                        ? 'Tidak ada riwayat yang cocok dengan pencarian.'
                        : (filterYear || filterMonth)
                          ? 'Tidak ada data untuk periode yang dipilih.'
                          : 'Belum ada riwayat pelatihan tercatat.'}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((row) => (
                    <tr key={row.id_hasil} className="hover:bg-sky-50 dark:hover:bg-slate-500/50 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {row.data_peserta?.nama_peserta || 'Guest'}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-mono">
                          PERNER: {row.data_peserta?.perner ?? '-'}
                        </p>
                      </td>
                      <td className="p-4 font-mono text-sky-400 font-medium text-xs">
                        {row.jadwal_pelatihan?.type_pelatihan?.nama_pelatihan || `Sesi ${row.id_jadwal}`}
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">
                          {row.jadwal_pelatihan?.tanggal_pelatihan}
                        </p>
                      </td>
                      <td className="p-4 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                        {row.jadwal_pelatihan?.durasi_jam != null
                          ? formatJam(parseDurasiToJam(row.jadwal_pelatihan.durasi_jam))
                        : '-'}
                      </td>
                      <td className="p-4 text-center font-mono">{row.nilai_pretest ?? '-'}</td>
                      <td className="p-4 text-center font-mono">{row.nilai_posttest ?? '-'}</td>
                      <td className="p-4 text-center font-mono font-bold">
                        {row.nilai_akhir != null ? Number(row.nilai_akhir).toFixed(1) : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${
                          row.status === 'Lulus'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {row.status || 'Proses'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {row.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            <Hourglass className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredHistory.length > 0 && (
                <tfoot>
                  <tr className="bg-sky-50 dark:bg-slate-900 border-t border-sky-200 dark:border-slate-600 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <td colSpan={2} className="p-3 pl-4 font-semibold">
                      {filteredHistory.length} sesi &bull; {jamSummary.length} peserta
                    </td>
                    <td className="p-3 text-center font-bold text-sky-400">
                      {totalJamKeseluruhan} jam
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    );
};