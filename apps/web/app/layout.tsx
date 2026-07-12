import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LAYR — Dünyadaki her yerin bir hikâyesi var",
  description:
    "Bulunduğun yerin geçmişini, bugününü ve insanların oraya bıraktığı izleri keşfet. AR ile hayata geçen dünya hafızası.",
  keywords: ["AR", "augmented reality", "harita", "hikaye", "tarih", "turizm"],
  icons: {
    icon: "/favicon.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "LAYR",
    description: "Dünyadaki her yerin bir hikâyesi var.",
    type: "website",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
