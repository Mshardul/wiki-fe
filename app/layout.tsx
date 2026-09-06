import { readFileSync } from "node:fs";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../css/wiki.css";
import "katex/dist/katex.min.css";

const sprite = readFileSync("sprite.svg", "utf8");

const swRegister = `if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/wiki-fe/sw.js",{scope:"/wiki-fe/"})})}`;

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
    <html lang="en">
      <head>
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
        <header className="topbar" />
        {children}
        <script dangerouslySetInnerHTML={{ __html: swRegister }} />
      </body>
    </html>
  );
}
