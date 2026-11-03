import { Header } from "@/components/ui";
import { Screen } from "@/components/Screen";

const faq = [
  ["Bagaimana cara scan QR Peta?", "Login dulu, lalu tekan tombol QR di Home atau Peta. Mode tamu tidak bisa scan QR."],
  ["Kenapa titik biru tidak muncul?", "Pastikan izin lokasi diizinkan dan GPS menyala."],
  ["Apa itu pin berbasis waktu?", "Pin dari panitia yang tampil hanya pada rentang tanggal-jam tertentu, lalu hilang otomatis."],
  ["Apakah data di aplikasi ini asli?", "Belum. Semua data di prototype ini adalah data contoh."],
];
/** V-13d Bantuan & FAQ */
export default function Bantuan() {
  return (
    <Screen header={<Header title="Bantuan & FAQ" />}>
      <div className="space-y-3">{faq.map(([q, a]) => <details key={q} className="rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold">{q}</summary><p className="mt-2 text-sm text-ink-2">{a}</p></details>)}</div>
    </Screen>
  );
}
