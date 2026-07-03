import type { Metadata, Viewport } from "next";
import Scripts from "./scripts";
import { asset } from "@/lib/asset";

export const metadata: Metadata = {
  metadataBase: new URL("https://johnnies.life"),
  title: "Johnnie's Life — An ongoing work in progress",
  description:
    "Dog-lover, sticker collector, music aficionado, conference enthusiast, and Staff Brand Designer at Webflow, working remotely from Miami, FL.",
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
  // Transparent status bar in standalone (Add to Home Screen) mode so content
  // paints behind it edge-to-edge, instead of "default"'s opaque bar that
  // pushes the whole webview down. Pairs with viewport-fit=cover + safe-area
  // insets. NOTE: a page-level `appleWebApp` REPLACES this object wholesale
  // (Next merges metadata shallowly), so any page that sets it must re-declare
  // capable + statusBarStyle or iOS falls back to "default" and gains a bar.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next's appleWebApp.capable emits only the modern mobile-web-app-capable;
    // older iOS keys standalone mode off the apple- prefixed variant.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Starting hero color; JS then keeps it in sync with the cycling background.
  themeColor: "#facbc7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Site stylesheet (fonts localized to /fonts) */}
        <link rel="stylesheet" href={asset("/site.css")} type="text/css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Render-blocking font CSS so the Adobe (Eckmann/Franklin) + Inconsolata
            fonts are known before first paint — avoids the flash/layout shift. */}
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/uqs5mpm.css" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&family=Source+Serif+4:wght@300;400;500;600&display=swap"
        />
        {/* Native interactions CSS (replaces the Webflow JS runtime) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
/* Anchor links are smooth-scrolled with a custom ease in app/scripts.tsx. */
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

/* Balance the footer copyright across lines. */
._w-60 > div { text-wrap: balance; }
#about, #work, #features, #contact { scroll-margin-top: 72px; }

/* Body, nav, and sections all read the cycling color from one --bg variable.
   The inline head script seeds --bg (random color) before first paint, so there
   is no flash/jump when the color loop takes over. */
.body { background-color: var(--bg, #facbc7) !important; }
.navbar, .nav_menu { background-color: var(--bg, #facbc7) !important; }
@media (max-width: 991px) { .navbar, .nav_menu { background-image: none !important; } }

/* Marquees: continuous horizontal scroll (was Webflow IX2). The track holds the
   items twice over, so translating -50% loops seamlessly. */
.marquee_track { display: flex; flex: none; width: max-content; }
.marquee_wrapper.cc-top .marquee_track,
.marquee_wrapper.cc-bottom .marquee_track { animation: marquee-left 80s linear infinite; }
@keyframes marquee-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* Footer "forever sharing" circle: slow spin (was Webflow IX2). */
.rotating_circle svg { animation: rotate-circle 22s linear infinite; transform-origin: 50% 50%; }
@keyframes rotate-circle { to { transform: rotate(360deg); } }

/* Reduced motion: stop the always-running decorative loops (they aid nothing
   comprehension-wise, so honour the preference and hold them still). */
@media (prefers-reduced-motion: reduce) {
  .marquee_wrapper.cc-top .marquee_track,
  .marquee_wrapper.cc-bottom .marquee_track,
  .rotating_circle svg { animation: none !important; }
}

/* Hamburger button (replaces the Lottie icon). */
.hamburger { display: none; flex-direction: column; justify-content: center; gap: 5px; width: 44px; height: 44px; padding: 0; background: transparent; border: 0; cursor: pointer; }
.hamburger span { display: block; width: 24px; height: 2px; margin: 0 auto; background: #1b1b1b; transition: transform .3s var(--ease-out), opacity .2s var(--ease-out); }
.navbar.is-open .hamburger span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.navbar.is-open .hamburger span:nth-child(2) { opacity: 0; }
.navbar.is-open .hamburger span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* Mobile nav menu: hidden behind the hamburger, drops down when open.
   Full-width links, text aligned to the logo (the container's gutter), and
   no divider under the last item. Dividers are 2px to match the rest of the
   design (nav underline, feature rows, pills are all 2px). */
@media (max-width: 767px) {
  .hamburger {
    display: flex;
    /* Webflow nudged the old Lottie icon 18px right; our clean 44px button
       doesn't need it (it would overflow the container). Right-align the bars
       so the icon's right edge meets the container edge — symmetric with the
       logo's left edge. */
    transform: none !important;
    align-items: flex-end;
  }
  .hamburger span { margin-left: auto !important; margin-right: 0 !important; }
  .nav_menu {
    display: flex !important;
    position: absolute; top: 100%; left: 0; right: 0;
    flex-direction: column; align-items: stretch !important; gap: 0 !important;
    padding: 0 !important;
    border-top: 2px solid #1b1b1b;
    border-bottom: 2px solid #1b1b1b;
    /* Slides down from under the bar on open, and back UP under it on close —
       symmetric, no fade. The panel sits just below the bar (top:100%) and a
       clip mask wipes it open/closed from its top edge. It's a child of the
       transformed navbar (so it would paint OVER the bar); clipping at the bar's
       bottom edge makes it read as sliding out from — and retracting back under
       — the bar. (Previously an opacity fade ran faster than the wipe on close,
       so it looked like it faded out instead of sliding up.) */
    clip-path: inset(0 0 100% 0);
    pointer-events: none;
    will-change: clip-path;
    transition: clip-path .42s cubic-bezier(.22, 1, .36, 1);
  }
  .navbar.is-open .nav_menu {
    clip-path: inset(0 0 0 0);
    pointer-events: auto;
  }
  @media (prefers-reduced-motion: reduce) {
    .nav_menu { transition: none; }
  }
  .nav_menu .nav_link {
    width: 100% !important;
    margin: 0 !important;
    padding: 18px 24px !important;       /* 24px = the mobile gutter, aligns with the logo */
    border-bottom: 2px solid #1b1b1b !important;
  }
  .nav_menu .nav_link:last-child { border-bottom: none !important; }
}
@media (min-width: 768px) { .hamburger { display: none !important; } }

/* Project tiles: a content-type badge centered on the media — a play glyph for
   gifs/videos, a plus glyph for static images. The badge sits outside the
   image's multiply blend so it stays crisp. */
.project-media { position: relative; display: flex; }

/* Content badge: a solid light disc with a 2px dark outline and the glyph in
   the text color — crisp and legible on any media (no backdrop-filter, so it
   renders identically across browsers). */
.media-badge {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
  background: #f5f5f5;
  border: 2px solid #1b1b1b;
  transition: transform .3s cubic-bezier(.22, 1, .36, 1);
}
.media-badge svg {
  width: 24px; height: 24px; fill: #1b1b1b;
}
/* Only grow on a real pointer — on touch this fires on tap (sticky hover). */
@media (hover: hover) and (pointer: fine) {
  .project-link_block:hover .media-badge {
    transform: translate(-50%, -50%) scale(1.07);
  }
}

/* Taller project thumbnails on phones so images aren't cropped so harshly. */
@media (max-width: 767px) {
  .project-media { aspect-ratio: 4 / 3; }
  .project-media .project-embed, .project-media .project-video {
    max-height: none !important; min-height: 0 !important; height: 100% !important;
  }
  /* Badge to the top-right corner (not centered) so it reads as a small
     "expand" affordance and doesn't sit over the middle of the thumbnail. */
  .media-badge {
    top: 12px; right: 12px; left: auto;
    width: 40px; height: 40px;
    transform: none;
  }
  .media-badge svg { width: 20px; height: 20px; }
}

/* Native lightbox for project tiles ("Zoom in"): image, or the mp4 on click. */
.lb-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 5vw; background: rgba(27,27,27,.85); opacity: 0; transition: opacity .2s ease; cursor: zoom-out; }
.lb-overlay.is-open { opacity: 1; }
.lb-overlay img, .lb-overlay video { max-width: 92vw; max-height: 92vh; border-radius: 4px; box-shadow: 0 12px 48px rgba(0,0,0,.45); }
`,
          }}
        />
        {/* Mark JS available + touch capability (CSS hooks used by the styles). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `var e=document.documentElement;e.classList.add('ui-mod-js');if('ontouchstart'in window||navigator.maxTouchPoints>0)e.classList.add('ui-mod-touch');`,
          }}
        />
        {/* Seed a RANDOM start color into --bg + theme-color before first paint,
            so the background starts on any palette color with no flash. The color
            loop (app/scripts.tsx) continues from this same phase via __bgOffset.
            The Discover page is exempt — it stays white (its own light/dark JS
            takes over), so we just seed white there. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function setMeta(c){var m=document.querySelector('meta[name=theme-color]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',c);}if(location.pathname.indexOf('/discover')!==-1){var pref=null;try{pref=localStorage.getItem('discover-theme');}catch(e){}var dk=pref?pref==='dark':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var dc=dk?'#080808':'#ffffff';var de=document.documentElement;de.style.setProperty('--bg',dc);de.style.colorScheme=dk?'dark':'light';if(dk)de.classList.add('is-dark');setMeta(dc);var upd=function(){de.style.setProperty('--vp-shortfall',Math.max(0,(window.screen&&screen.height||0)-window.innerHeight)+'px');};upd();window.addEventListener('resize',upd);return;}if(location.pathname.indexOf('/stuff')!==-1){var sdk=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var sc=sdk?'#0c0c0d':'#f1f1f0';var se=document.documentElement;se.style.setProperty('--bg',sc);se.style.colorScheme=sdk?'dark':'light';setMeta(sc);return;}var P=[[174,190,169],[233,178,151],[250,203,199],[184,166,204]],SEG=6000,n=P.length,off=Math.floor(Math.random()*SEG*n);window.__bgOffset=off;var s=Math.floor(off/SEG)%n,f=off%SEG/SEG,a=P[s],b=P[(s+1)%n],c='rgb('+Math.round(a[0]+(b[0]-a[0])*f)+', '+Math.round(a[1]+(b[1]-a[1])*f)+', '+Math.round(a[2]+(b[2]-a[2])*f)+')';document.documentElement.style.setProperty('--bg',c);setMeta(c);})();`,
          }}
        />
      </head>
      <body className="body" suppressHydrationWarning>
        {/* Global embed styles (verbatim from original) */}
        <div className="cc-hidden ui-embed">
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
