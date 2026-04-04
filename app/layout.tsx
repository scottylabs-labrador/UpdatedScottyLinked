import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import MobileTabBar from "./_components/MobileTabBar";
import AppNavbar from "./_components/AppNavbar";
import { HomeTabNavProvider } from "./_components/HomeTabNav";
import { getServerMe } from "@/lib/session";
import { tabFromSearchString } from "@/lib/homeTab";

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
  const h = await headers();
  const pathnameFromMw = h.get("x-pathname") ?? "";
  const searchFromMw = h.get("x-url-search") ?? "";
  const initialHomeTab =
    pathnameFromMw === "/"
      ? tabFromSearchString(searchFromMw)
      : ("feed" as const);

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
        <HomeTabNavProvider initialHomeTab={initialHomeTab}>
          <AppNavbar initialAppUser={initialNavUser} />
          {children}
          <MobileTabBar />
        </HomeTabNavProvider>
      </body>
    </html>
  );
}
