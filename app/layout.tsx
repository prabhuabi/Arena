import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "../components/auth/SessionProvider";
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth";
import SideBar from "../components/sidebar/SideBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arena",
  description: "Arena: The Ultimate Coffee Break Challenge",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SessionProvider session={session}>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <SideBar />
            <main style={{ flex: 1, paddingLeft: '5rem' }}>
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
