import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LinkView — Low-Latency Remote Viewing & Control",
  description:
    "Production-grade peer-to-peer remote viewing platform with real-time network insights, adaptive streaming, and sub-300ms latency.",
  keywords: [
    "WebRTC",
    "remote desktop",
    "screen sharing",
    "peer-to-peer",
    "low latency",
  ],
  authors: [{ name: "LinkView" }],
  openGraph: {
    title: "LinkView — Browser-Based Remote Viewing",
    description: "Share and view screens with real-time network insights",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-slate-950 text-white antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
