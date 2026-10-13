import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Health Centre Management | AI Decision-Support Platform",
  description:
    "Enterprise-grade clinical inventory dashboard with real-time SSE surveillance, AI demand forecasting, FEFO expiry tracking, and emergency spatial bed coordination.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-sky-100 selection:text-sky-900">
        {children}
      </body>
    </html>
  );
}
