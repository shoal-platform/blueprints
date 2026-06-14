import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dropship Ops — order pipeline dashboard",
  description:
    "Live dashboard over three microservices: orders, inventory, and notifications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <header className="border-b border-stone-200 dark:border-stone-800">
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
            <span className="text-lg font-semibold tracking-tight">
              📦 Dropship Ops
            </span>
            <span className="text-sm text-stone-500">
              orders · inventory · notifications
            </span>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 px-6 py-6 text-center text-sm text-stone-500 dark:border-stone-800">
          Three microservices, one database — a Shoal blueprint demo
        </footer>
      </body>
    </html>
  );
}
