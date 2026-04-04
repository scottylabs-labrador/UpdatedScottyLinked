import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import MobileTabBar from "./_components/MobileTabBar";
import AppNavbar from "./_components/AppNavbar";
import { HomeTabNavProvider } from "./_components/HomeTabNav";
import ThemeSync from "./_components/ThemeSync";
import { getServerMe } from "@/lib/session";
import { tabFromSearchString } from "@/lib/homeTab";
import { THEME_STORAGE_KEY } from "@/lib/theme";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark")document.documentElement.classList.add("dark");else if(t==="light")document.documentElement.classList.remove("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[var(--page)] text-[var(--foreground)]">
        <HomeTabNavProvider initialHomeTab={initialHomeTab}>
          <ThemeSync />
          <AppNavbar initialAppUser={initialNavUser} />
          {children}
          <MobileTabBar />
        </HomeTabNavProvider>
      </body>
    </html>
  );
}
