import type { Metadata, Viewport } from "next";
import Scripts from "./scripts";
import { asset } from "@/lib/asset";

export const metadata: Metadata = {
  metadataBase: new URL("https://johnnies.life"),
  title: "Johnnie's Life — An ongoing work in progress",
  description:
    "Dog-lover, sticker collector, music aficionado, conference enthusiast, and Staff Brand Designer at Webflow, working remotely from Miami, FL.",
  generator: "Webflow",
  icons: {
    icon: asset("/images/favicon.png"),
    apple: asset("/images/webclip.png"),
  },
  openGraph: {
    title: "Johnnie's Life — An ongoing work in progress",
    images: [asset("/images/opengraph.jpg")],
  },
  twitter: {
    title: "Johnnie's Life — An ongoing work in progress",
    images: [asset("/images/opengraph.jpg")],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-wf-domain="johnnies.life"
      data-wf-page="6056222abaee8b5188754749"
      data-wf-site="6056222abaee8b22b8754748"
      suppressHydrationWarning
    >
      <head>
        {/* Exact Webflow stylesheet (fonts localized to /fonts) */}
        <link rel="preconnect" href="https://cdn.prod.website-files.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={asset("/webflow.css")} type="text/css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Render-blocking font CSS so the Adobe (Eckmann/Franklin) + Inconsolata
            fonts are known before first paint — avoids the flash/layout shift. */}
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/uqs5mpm.css" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap"
        />
        {/* Smoke canvas positioning (verbatim from original) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
canvas {
    position: absolute;
    top: -4vh;
    width: 100% !important;
    left: 0;
    right: 0;
    bottom: 0;
    mix-blend-mode: plus-lighter;
    pointer-events: none;
    opacity: 0.75;
    height: 100dvh !important
}

/* Mobile: keep the fixed nav (and its menu/overlay) matching the cycling page
   background, driven off the --bg variable synced in app/scripts.tsx. Desktop
   keeps its white-gradient reveal. */
@media (max-width: 991px) {
  .navbar, .nav_menu, .w-nav-overlay {
    background-color: var(--bg, #facbc7) !important;
    background-image: none !important;
  }
}
`,
          }}
        />
        {/* Webflow JS-detection: adds .w-mod-js / .w-mod-touch before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch")}(window,document);`,
          }}
        />
      </head>
      <body data-w-id="6056222abaee8bab2175474a" className="body" suppressHydrationWarning>
        {/* Global embed styles (verbatim from original) */}
        <div className="cc-hidden w-embed">
          <style
            dangerouslySetInnerHTML={{
              __html: `
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-underline-position: under;
}

a {
	color: inherit;
  text-decoration: inherit;
}

::selection {
  background: rgba(232, 194, 189, 0.6);
  color: #1b1b1b;
}

::-moz-selection {
  background: rgba(232, 194, 189, 0.6);
  color: #1b1b1b;
}

.blob {
	mix-blend-mode: overlay;
}
`,
            }}
          />
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
