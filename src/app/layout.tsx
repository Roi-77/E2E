import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Chat",
  description: "End-to-end encrypted demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-400 min-h-screen text-slate-800">{children}</body>
    </html>
  );
}
