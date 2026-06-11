import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "The Horse Almanac",
  description: "A simple guide to different types of horses.",
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
          <nav className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              🐎 The Horse Almanac
            </Link>
            <div className="flex gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-amber-700">
                Home
              </Link>
              <Link href="/breeds" className="hover:text-amber-700">
                Breeds
              </Link>
              <Link href="/about" className="hover:text-amber-700">
                About
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
          {children}
        </main>
        <footer className="border-t border-stone-200 px-6 py-6 text-center text-sm text-stone-500 dark:border-stone-800">
          © {new Date().getFullYear()} The Horse Almanac
        </footer>
      </body>
    </html>
  );
}
