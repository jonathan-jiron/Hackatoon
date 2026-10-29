import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DataProvider } from "@/lib/store";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";

// One grotesk with real tabular figures, loaded for real instead of falling back to the OS face.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "CTT FISEI · Panel de ventas",
  description: "Conversaciones del asistente de ventas en tiempo real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <DataProvider>
          <ToastProvider>
            <Nav />
            <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>
          </ToastProvider>
        </DataProvider>
      </body>
    </html>
  );
}
