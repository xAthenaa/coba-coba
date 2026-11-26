import { Header } from "@/components/ui";
import { Screen } from "@/components/Screen";

const faq = [
  ["Bagaimana cara scan QR Peta?", "Login sebagai pengunjung, lalu tekan tombol QR di Home atau Peta. Semua fitur WAYO memerlukan login."],
  ["Kenapa titik biru tidak muncul?", "Pastikan izin lokasi diizinkan dan GPS menyala."],
  ["Apa itu pin berbasis waktu?", "Pin dari panitia yang tampil hanya pada rentang tanggal-jam tertentu, lalu hilang otomatis."],
];
/** V-13d Bantuan & FAQ */
export default function Bantuan() {
  return (
    <Screen header={<Header title="Bantuan & FAQ" />}>
      <div className="space-y-3">{faq.map(([q, a]) => <details key={q} className="rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold">{q}</summary><p className="mt-2 text-sm text-ink-2">{a}</p></details>)}</div>
    </Screen>
  );
}
