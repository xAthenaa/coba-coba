import { Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
/** V-13e Tentang WAYO */
export default function Tentang() {
  return (
    <Screen header={<Header title="Tentang WAYO" />}>
      <h2 className="text-2xl font-bold text-primary">WAYO — Way To Go</h2>
      <p className="mt-2 text-sm text-ink-2">Aplikasi peta & navigasi jalan kaki untuk area event kampus, dimulai dari Universitas Udayana (Kampus Sudirman & Jimbaran).</p>
      <p className="mt-4 text-sm text-ink-2">Versi prototype UI 0.1 · data contoh · peta © OpenStreetMap contributors.</p>
    </Screen>
  );
}
