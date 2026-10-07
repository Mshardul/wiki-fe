import { readFileSync } from "node:fs";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { BookmarksModal } from "@/components/chrome/BookmarksModal";
import { HealthPing } from "@/components/chrome/HealthPing";
import { IconTooltip } from "@/components/chrome/IconTooltip";
import { NavTransition } from "@/components/chrome/NavTransition";
import { ToastHost } from "@/components/chrome/ToastHost";
import { WikiSwitcherHost } from "@/components/chrome/WikiSwitcherHost";
import { SwipeGestures } from "@/components/mobile/SwipeGestures";
import { ViewportHandler } from "@/components/mobile/ViewportHandler";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { IosNudge } from "@/components/pwa/IosNudge";
import { ComplexityCompare } from "@/components/reader/ComplexityCompare";
import { SearchModal } from "@/components/search/SearchModal";
import { DistractionFree } from "@/components/settings/DistractionFree";
import { PreferencesModal } from "@/components/settings/PreferencesModal";
import { PrintTrigger } from "@/components/settings/PrintTrigger";
import { SettingsInit } from "@/components/settings/SettingsInit";
import { SessionInit } from "@/components/sync/SessionInit";
import "../css/wiki.css";
import "katex/dist/katex.min.css";

const sprite = readFileSync("sprite.svg", "utf8");

// Also unregisters the pre-Next `wiki-sw.js` left behind in returning visitors' browsers.
const swRegister = `if("serviceWorker" in navigator){window.addEventListener("load",function(){var sw=navigator.serviceWorker;sw.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){var w=r.active||r.waiting||r.installing;return w&&/\\/wiki-sw\\.js$/.test(w.scriptURL)?r.unregister():0}))}).catch(function(){}).then(function(){sw.register("/wiki-fe/sw.js",{scope:"/wiki-fe/"})})})}`;

// Pre-hydration theme boot: set data-theme + fontSize before first paint to avoid a flash; full applySettings() (all preset vars) runs in SettingsInit on mount.
const bootTheme = `(function(){try{var s=JSON.parse(localStorage.getItem("wiki-settings")||"null");var dark=s&&s.backgroundId?s.backgroundId.indexOf("light-")!==0:!window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.setAttribute("data-theme",dark?"dark":"light");if(s&&s.fontSize){var m={S:"87.5%",M:"100%",L:"112.5%"};document.documentElement.style.fontSize=m[s.fontSize]||"100%"}}catch(e){}})()`;

export const metadata: Metadata = {
  title: { default: "Wiki", template: "%s · Wiki" },
  description: "System Design and DSA interview prep.",
  robots: { index: false, follow: false },
  manifest: "/wiki-fe/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/wiki-fe/icon.svg", type: "image/svg+xml" },
      { url: "/wiki-fe/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/wiki-fe/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/wiki-fe/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootTheme }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router head, rule targets pages/_document */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: sprite }} />
        {children}
        {/* AuthModal must register its opener before SessionInit: SessionInit calls openAuthModal() sync on mount, and effects run in mount order. */}
        <AuthModal />
        <SessionInit />
        <SettingsInit />
        <HealthPing />
        <NavTransition />
        <DistractionFree />
        <BookmarksModal />
        <SearchModal />
        <PreferencesModal />
        <ComplexityCompare />
        <PrintTrigger />
        <WikiSwitcherHost />
        <SwipeGestures />
        <ViewportHandler />
        <InstallPrompt />
        <IosNudge />
        <ToastHost />
        <IconTooltip />
        <script dangerouslySetInnerHTML={{ __html: swRegister }} />
      </body>
    </html>
  );
}
