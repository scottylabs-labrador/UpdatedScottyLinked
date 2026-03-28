import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import MobileTabBar from "./_components/MobileTabBar";
import AppNavbar from "./_components/AppNavbar";
import { getServerMe } from "@/lib/session";

export const metadata: Metadata = {
  title: "ScottyLinked",
  description: "CMU Professional Network",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const me = await getServerMe();
  const initialNavUser = me.appUser
    ? {
        id: me.appUser.id,
        handle: me.appUser.handle,
        fullName: me.appUser.fullName,
        photoURL: me.appUser.photoURL,
        isModerator: me.appUser.isModerator,
      }
    : null;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-[var(--page)] text-[var(--foreground)]">
        <AppNavbar initialAppUser={initialNavUser} />
        {children}
        <Suspense fallback={null}>
          <MobileTabBar />
        </Suspense>
      </body>
    </html>
  );
}
