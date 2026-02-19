import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Fluxi Dashboard",
  description: "Dashboard financiero empresarial",
};

export const viewport: Viewport = {
  width: 1200,
  initialScale: 0.3,
  maximumScale: 2,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-[#F7F7F8]">
        <Sidebar />
        <main className="ml-16 peer-hover:ml-56 min-h-screen transition-all duration-200 ease-in-out">
          {children}
        </main>
      </body>
    </html>
  );
}