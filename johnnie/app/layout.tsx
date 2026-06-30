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
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
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
          href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap"
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

/* Hamburger button (replaces the Lottie icon). */
.hamburger { display: none; flex-direction: column; justify-content: center; gap: 5px; width: 44px; height: 44px; padding: 0; background: transparent; border: 0; cursor: pointer; }
.hamburger span { display: block; width: 24px; height: 2px; margin: 0 auto; background: #1b1b1b; transition: transform .3s ease, opacity .2s ease; }
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
    /* Slide down on open / up on close. Tucked above the bar (translateY -100%)
       and concealed (opacity 0) when closed; a snappy, buttery ease drops it in.
       transform + opacity are GPU-composited, so the motion stays smooth. */
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    will-change: transform;
    transition: transform .42s cubic-bezier(.22, 1, .36, 1), opacity .26s ease;
  }
  .navbar.is-open .nav_menu {
    transform: translateY(0);
    opacity: 1;
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

/* Liquid-glass content badge (iOS-style): real refraction + a frosted, beveled
   body. The unprefixed backdrop-filter appends url(#badge-glass) — an SVG
   feDisplacementMap (defined once in <body>) that bends the project image behind
   the badge like a convex glass lens: the map encodes horizontal shift in red,
   vertical in green, neutral (128) at center, so the image splays outward toward
   the rim. This is jh3y/kube's technique and runs only in Chromium; Safari and
   Firefox accept backdrop-filter but silently drop the SVG part, and old iOS
   Safari reads the -webkit- chain below — both gracefully fall back to the flat
   frosted blur. Layered inset shadows form the glass bevel (bright top, shaded
   bottom); ::before pools a specular sheen top-left; ::after draws the refractive
   hairline rim. A light dark-vibrancy tint keeps the white glyph legible. */
.media-badge {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none; isolation: isolate;
  background: rgba(24, 24, 28, 0.22);
  -webkit-backdrop-filter: blur(9px) saturate(185%);
  backdrop-filter: blur(9px) saturate(185%) url(#badge-glass);
  box-shadow:
    0 7px 22px rgba(0, 0, 0, 0.24),
    inset 0 1.5px 1px rgba(255, 255, 255, 0.55),
    inset 0 -5px 10px rgba(0, 0, 0, 0.22);
  transition: transform .3s cubic-bezier(.22, 1, .36, 1), box-shadow .3s ease, background .3s ease;
}
/* Specular sheen — soft light pooling toward the top-left. */
.media-badge::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 0;
  background:
    radial-gradient(115% 115% at 30% 20%, rgba(255,255,255,.5), rgba(255,255,255,0) 45%),
    linear-gradient(165deg, rgba(255,255,255,.14), rgba(255,255,255,0) 58%);
}
/* Refractive rim — a 1px gradient ring (masked) that's brightest up top and
   round the upper-left, dimming toward the bottom: glass catching the light. */
.media-badge::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 2;
  padding: 1px;
  background: linear-gradient(155deg, rgba(255,255,255,.9), rgba(255,255,255,.25) 30%, rgba(255,255,255,0) 58%, rgba(255,255,255,.18));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
}
.media-badge svg {
  position: relative; z-index: 1;
  width: 25px; height: 25px; fill: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .5));
}
.media-badge.is-play svg { margin-left: 2px; }
.project-link_block:hover .media-badge {
  transform: translate(-50%, -50%) scale(1.07);
  background: rgba(24, 24, 28, 0.16);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.28),
    inset 0 1.5px 1px rgba(255, 255, 255, 0.7),
    inset 0 -5px 10px rgba(0, 0, 0, 0.24);
}

/* Taller project thumbnails on phones so images aren't cropped so harshly. */
@media (max-width: 767px) {
  .project-media { aspect-ratio: 4 / 3; }
  .project-media .project-embed, .project-media .project-video {
    max-height: none !important; min-height: 0 !important; height: 100% !important;
  }
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
            __html: `(function(){function setMeta(c){var m=document.querySelector('meta[name=theme-color]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',c);}if(location.pathname.indexOf('/discover')!==-1){document.documentElement.style.setProperty('--bg','#ffffff');setMeta('#ffffff');return;}var P=[[174,190,169],[233,178,151],[250,203,199],[184,166,204]],SEG=6000,n=P.length,off=Math.floor(Math.random()*SEG*n);window.__bgOffset=off;var s=Math.floor(off/SEG)%n,f=off%SEG/SEG,a=P[s],b=P[(s+1)%n],c='rgb('+Math.round(a[0]+(b[0]-a[0])*f)+', '+Math.round(a[1]+(b[1]-a[1])*f)+', '+Math.round(a[2]+(b[2]-a[2])*f)+')';document.documentElement.style.setProperty('--bg',c);setMeta(c);})();`,
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
        {/* Liquid-glass refraction filter for the project media badges (used by
            .media-badge's backdrop-filter). Two feImage ramps — a left→right red
            gradient (encodes horizontal shift) and a top→bottom green one
            (vertical shift) — are screen-blended into a displacement map that's
            neutral (128) at center and splays toward the rim; feDisplacementMap
            then warps the badge's backdrop (the project image) by up to ±7px like
            a convex lens. sRGB keeps 128 the true neutral point. Chromium-only;
            a harmless 0×0 svg elsewhere (Safari falls back to the frosted blur). */}
        <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
          <filter id="badge-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage
              href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3E%3ClinearGradient%20id='g'%20x1='0'%20x2='1'%20y1='0'%20y2='0'%3E%3Cstop%20offset='0'%20stop-color='%23000'/%3E%3Cstop%20offset='1'%20stop-color='%23f00'/%3E%3C/linearGradient%3E%3Crect%20width='100'%20height='100'%20fill='url(%23g)'/%3E%3C/svg%3E"
              preserveAspectRatio="none"
              x="0"
              y="0"
              width="100%"
              height="100%"
              result="rx"
            />
            <feImage
              href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3E%3ClinearGradient%20id='g'%20x1='0'%20x2='0'%20y1='0'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%23000'/%3E%3Cstop%20offset='1'%20stop-color='%230f0'/%3E%3C/linearGradient%3E%3Crect%20width='100'%20height='100'%20fill='url(%23g)'/%3E%3C/svg%3E"
              preserveAspectRatio="none"
              x="0"
              y="0"
              width="100%"
              height="100%"
              result="gy"
            />
            <feBlend in="rx" in2="gy" mode="screen" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale="14" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
