import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });

export const metadata: Metadata = { title: "WAYO — Way To Go", description: "Peta & navigasi jalan kaki area event kampus (prototype UI)" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1E3A8A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <div className="relative mx-auto flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-white shadow-xl">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
