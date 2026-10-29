import "./globals.css";
import type { Metadata } from "next";
import { DataProvider } from "@/lib/store";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "CTT FISEI · Panel de ventas",
  description: "Conversaciones del asistente de ventas en tiempo real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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
