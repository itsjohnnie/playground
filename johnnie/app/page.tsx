import { getProjects, getFeatures, type Project, type Feature } from "@/lib/content";
import { asset } from "@/lib/asset";
import ContactForm from "./contact-form";
import SiteNav from "./site-nav";

// Non-breaking spaces (U+00A0) around the bullet so the gaps don't collapse —
// matches the live site exactly.
const MARQUEE_TEXT = "design &\u00A0web @ anthropic\u00A0\u00A0·\u00A0\u00A0";

// Bio paragraph (inline emphasis + strike).
const BIO_HTML = `<strong>Johnnie Gomez</strong> is a dog-lover, sticker collector, music aficionado, and conference enthusiast<strong>.</strong> He was born and raised in Buenos Aires, Argentina, but has since moved to <span aria-hidden="true" class="striked">Washington, DC</span> Miami, FL with his wife Dani, Dante, baby Olivia, and their doggy Honey, where he designs and builds websites remotely for <strong>Anthropic</strong>, as a Member of Technical Staff.<br/><br/>Previously at <strong>Webflow</strong>, he worked closely with a range of internal teams — Growth, Product Design, Lifecycle, and Enterprise — creating high-performing, creative, and accessible web experiences, and evolving the brand alongside a bunch of amazing &amp; talented folks.<br/><br/>Before that, he co-ran the agency <strong>Cruz Barcelona</strong> for over a decade, based in Buenos Aires, Argentina, working with a diverse set of clients across fashion, branding, advertising, illustration, sustainability, editorial, store design, and web design and development.<br/><br/>He also mentors designers at all stages of their careers, and is deeply invested in community and community-driven initiatives.<br/><br/><strong>#SharingIsCaring</strong><br/>`;

// "Forever sharing · forever learning" rotating circle (verbatim SVG).
const CIRCLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68.61 68.61"><defs><style>.cls-1{font-size:10px;font-family:franklin-gothic-urw-cond, sans-serif;;font-weight:500;}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><text class="cls-1" transform="translate(34.25 8.25) rotate(4.44)">F</text><text class="cls-1" transform="translate(38.39 8.49) rotate(15.05)">O</text><text class="cls-1" transform="translate(43.67 9.92) rotate(26.77)">R</text><text class="cls-1" transform="translate(48.25 12.25) rotate(37.3)">E</text><text class="cls-1" transform="matrix(0.67, 0.74, -0.74, 0.67, 52.08, 15.19)">V</text><text class="cls-1" transform="translate(55.16 18.6) rotate(57.94)">E</text><text class="cls-1" transform="translate(57.58 22.38) rotate(68.57)">R</text><text class="cls-1" transform="matrix(0.24, 0.97, -0.97, 0.24, 59.38, 27.28)"> </text><text class="cls-1" transform="translate(59.93 29.05) rotate(84.02)">S</text><text class="cls-1" transform="matrix(-0.09, 1, -1, -0.09, 60.47, 34.01)">H</text><text class="cls-1" transform="translate(59.96 39.39) rotate(106.57)">A</text><text class="cls-1" transform="translate(58.61 44.04) rotate(117.64)">R</text><text class="cls-1" transform="translate(56.12 48.58) rotate(125.85)">I</text><text class="cls-1" transform="matrix(-0.7, 0.71, -0.71, -0.7, 54.85, 50.55)">N</text><text class="cls-1" transform="translate(51.02 54.47) rotate(146.47)">G</text><text class="cls-1" transform="translate(46.31 57.44) rotate(154.62)"> </text><text class="cls-1" transform="translate(44.59 58.25) rotate(158.83)"> </text><text class="cls-1" transform="translate(42.79 58.96) rotate(163.7)">·</text><text class="cls-1" transform="matrix(-0.98, 0.2, -0.2, -0.98, 40.47, 59.62)"> </text><text class="cls-1" transform="translate(38.59 60) rotate(172.71)"> </text><text class="cls-1" transform="matrix(-1, 0.02, -0.02, -1, 36.76, 60.3)">F</text><text class="cls-1" transform="matrix(-0.99, -0.17, 0.17, -0.99, 32.62, 60.43)">O</text><text class="cls-1" transform="matrix(-0.93, -0.37, 0.37, -0.93, 27.22, 59.49)">R</text><text class="cls-1" transform="matrix(-0.85, -0.53, 0.53, -0.85, 22.45, 57.58)">E</text><text class="cls-1" transform="matrix(-0.73, -0.68, 0.68, -0.73, 18.37, 54.98)">V</text><text class="cls-1" transform="translate(14.98 51.85) rotate(-127.13)">E</text><text class="cls-1" transform="translate(12.24 48.3) rotate(-116.56)">R</text><text class="cls-1" transform="matrix(-0.32, -0.95, 0.95, -0.32, 10.01, 43.58)"> </text><text class="cls-1" transform="translate(9.35 41.83) rotate(-102.15)">L</text><text class="cls-1" transform="matrix(-0.05, -1, 1, -0.05, 8.48, 37.93)">E</text><text class="cls-1" transform="matrix(0.14, -0.99, 0.99, 0.14, 8.25, 33.06)">A</text><text class="cls-1" transform="translate(8.9 28.3) rotate(-70.86)">R</text><text class="cls-1" transform="translate(10.56 23.43) rotate(-59.15)">N</text><text class="cls-1" transform="matrix(0.64, -0.77, 0.77, 0.64, 13.49, 18.75)">I</text><text class="cls-1" transform="matrix(0.74, -0.67, 0.67, 0.74, 14.88, 16.86)">N</text><text class="cls-1" transform="translate(18.96 13.18) rotate(-29.9)">G</text><text class="cls-1" transform="translate(23.82 10.53) rotate(-21.79)"> </text><text class="cls-1" transform="matrix(0.95, -0.3, 0.3, 0.95, 25.63, 9.81)"> </text><text class="cls-1" transform="translate(27.43 9.23) rotate(-12.69)">·</text><text class="cls-1" transform="translate(29.81 8.71) rotate(-7.88)"> </text><text class="cls-1" transform="translate(31.71 8.45) rotate(-3.67)"> </text></g></g></svg>`;

function ProjectItem({ p }: { p: Project }) {
  // Featured projects carry an award/"shared" callout banner attached under the
  // card. When featured, the card's bottom corners go sharp and the callout
  // takes the rounded bottom, so the two read as one unit (see site.css).
  const featured = !!p.award_text;
  return (
    <div role="listitem" className={`project-item ui-dyn-item${featured ? " is-featured" : ""}`}>
      <a
        href="#"
        className="project-link_block ui-inline-block"
        data-video={p.video ? asset(p.video) : undefined}
      >
        <div className="project-media">
          <div className="project-embed ui-embed">
            {/* Static poster/gif as an image (no native video control, videos
                stay deferred); the mp4 plays in the lightbox on click. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset(p.poster)} alt="" className="project-video" loading="lazy" />
          </div>
          <div className="media-badge is-plus" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" /></svg>
          </div>
        </div>
        <div id="ui-node-_480febd2-ea4c-f172-8bd0-eedc316394bd-88754749" className="project-content">
          {p.tag ? (
            <div className="project-content-tag">{p.tag}</div>
          ) : (
            <div className="project-content-tag ui-dyn-bind-empty"></div>
          )}
          <div className="project-content_info">
            <h3 className="project-heading">{p.title}</h3>
            <div className="button cc-project">
              <div className="text-block-2">Zoom in</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset("/icons/arrow-right.svg")} loading="lazy" alt="" />
            </div>
          </div>
        </div>
      </a>
      {p.award_text ? (
        <a href={p.award_url} target="_blank" className="project-award_link" rel="noreferrer">
          {p.award_text}
        </a>
      ) : null}
    </div>
  );
}

function FeatureItem({ f }: { f: Feature }) {
  return (
    <div role="listitem" className="ui-dyn-item">
      <a
        rel="noreferrer"
        href={f.url}
        target="_blank"
        className="feature-link ui-inline-block"
      >
        <div className="feature-content">
          <div className="feature-headiing">{f.title}</div>
          <div className="feature-category">{f.category}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/icons/arrow-top-right.svg")} loading="lazy" alt="" className="feature-arrow" />
      </a>
    </div>
  );
}

export default function Home() {
  const projects = getProjects();
  const features = getFeatures();

  return (
    <>
      {/* ============ FIXED NAV ============ */}
      <SiteNav />

      {/* ============ HERO ============ */}
      <header id="hero" className="section hero">
        {/* The scrolling marquees repeat the same text ~40 times for the visual
            loop — hide the whole thing from assistive tech and expose the
            message once, invisibly, instead. */}
        <p className="sr-only">design &amp; web @ anthropic</p>
        <div className="marquee_wrapper cc-top" aria-hidden="true">
          <div className="marquee_track">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="marquee-text_item">{MARQUEE_TEXT}</div>
            ))}
          </div>
        </div>
        <div className="marquee_wrapper cc-bottom" aria-hidden="true">
          <div className="marquee_track">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="marquee-text_item">{MARQUEE_TEXT}</div>
            ))}
          </div>
        </div>
        <div className="z-index-top full-width">
          <div className="hero-bottom_right">
            <div className="hero-text">Born &amp; Raised in ARgentina</div>
          </div>
          <div className="container cc-center cc-hero">
            <h1 className="hero-heading">Hola hola &amp;<br />welcome to johnnie&#x27;s<br />home &amp; life</h1>
            <div className="subhead cc-hero">DESIGNING FROM MIAMI, FL<br /></div>
            <a href="#about" className="button u-mt-3 ui-button">Who is Johnnie?</a>
          </div>
          <div className="hero-bottom_left">
            <h2 className="label">Follow him</h2>
            <a rel="noreferrer" href="https://x.com/callmejohnnie" target="_blank" className="social-link_block ui-inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset("/icons/logo-x.svg")} loading="lazy" width={24} alt="X" />
            </a>
            <a rel="noreferrer" href="https://www.linkedin.com/in/johnniegomez/" target="_blank" className="social-link_block cc-last ui-inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset("/icons/logo-linkedin.svg")} loading="lazy" width={24} alt="LinkedIn" />
            </a>
          </div>
        </div>
        <div className="blob-wrapper"></div>
      </header>

      <main>
        {/* ============ ABOUT ============ */}
        <section id="about" className="section cc-about">
          <div className="container">
            <div className="line_divider"></div>
            <h2 className="section_heading">originally juan, but you can call him <span>johnnie</span></h2>
            <div className="ui-layout-grid grid cc-gap-4">
              <div className="paragraph cc-large" dangerouslySetInnerHTML={{ __html: BIO_HTML }} />
              <div id="ui-node-_105c8a76-68e7-b361-f2e2-5c51f760b469-88754749" className="u-relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset("/images/johnnie-gomez.jpeg")}
                  loading="lazy"
                  sizes="(max-width: 2000px) 100vw, 2000px"
                  srcSet={`${asset("/images/johnnie-gomez-p-500.jpeg")} 500w, ${asset("/images/johnnie-gomez.jpeg")} 2000w`}
                  alt="Portrait of Johnnie Gomez"
                  className="photo"
                />
                <div className="year cc-right" aria-hidden="true">2026</div>
                <div className="year" aria-hidden="true">2006</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ WORK / PORTFOLIO ============ */}
        <section id="work" className="section cc-portfolio">
          <div className="container">
            <div className="line_divider"></div>
            <h2 className="section_heading">These are<br />his featured projects, enjoy.</h2>
            <div className="ui-dyn-list">
              <div role="list" className="project-list ui-dyn-items">
                {projects.map((p) => (
                  <ProjectItem key={p.title + p.poster} p={p} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ FEATURES ============ */}
        <section id="features" className="section cc-feature">
          <div className="container cc-center">
            <h2 className="section_heading">Features &amp;<br />Appearances</h2>
            <div>
              <div className="ui-dyn-list">
                <div role="list" className="feature-list ui-dyn-items">
                  {features.map((f) => (
                    <FeatureItem key={f.title} f={f} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CONTACT ============ */}
        <section id="contact" className="section cc-contact">
          <div className="container">
            <div className="div-block-3">
              <h2 className="section_heading cc-sub">Contact Johnnie</h2>
              <div className="footer-availability">
                <div className="footer-availability-indicator" aria-hidden="true"></div>
                <div className="footer-availability-text">not Available for projects</div>
              </div>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="section cc-contact">
        <div className="container">
          <div className="ui-layout-grid grid cc-gap-4 cc-col_3">
            <div id="ui-node-bcb10cf6-8be8-4af7-ed1a-458ad6dfee0d-88754749" className="footer-column cc-first">
              {/* The SVG spells "forever sharing · forever learning" one letter
                  per <text> node — screen readers would read it letter by
                  letter. Hide it and put the accessible name on the link. */}
              <a
                href="#hero"
                className="brand cc-footer ui-inline-block"
                aria-label="Forever sharing, forever learning — back to top"
              >
                <div
                  aria-hidden="true"
                  className="rotating_circle ui-embed"
                  dangerouslySetInnerHTML={{ __html: CIRCLE_SVG }}
                />
              </a>
              <div className="_w-60">
                <div>Johnnie&#x27;s Life © 2026 — all the work here is his own. Please ask before using any of it. </div>
              </div>
            </div>
            <div id="ui-node-_3f9b5b68-6de6-9e5a-0f5e-3f024a230b92-88754749" className="footer-column">
              <h2 className="footer-list_title">Navigate</h2>
              <ul role="list" className="footer-list ui-list-unstyled">
                <li className="footer-list_item"><a href="#hero" className="footer-link ui-inline-block"><div>Back to top</div></a></li>
                <li><a href="#about" className="footer-link ui-inline-block"><div>About</div></a></li>
                <li><a href="#work" className="footer-link ui-inline-block"><div>Work</div></a></li>
                <li><a href="#features" className="footer-link ui-inline-block"><div>Features</div></a></li>
                <li><a href="#contact" className="footer-link ui-inline-block"><div>Contact</div></a></li>
              </ul>
            </div>
            <div id="ui-node-_1047d52f-8c02-246e-93ff-f4e9ec2f6519-88754749" className="footer-column">
              <h2 className="footer-list_title">Social</h2>
              <ul role="list" className="footer-list ui-list-unstyled">
                <li className="footer-list_item"><a rel="noreferrer" href="https://x.com/callmejohnnie" target="_blank" className="footer-link ui-inline-block"><div>X.com</div></a></li>
                <li><a rel="noreferrer" href="https://www.linkedin.com/in/johnniegomez/" target="_blank" className="footer-link ui-inline-block"><div>LinkedIn</div></a></li>
                <li><a rel="noreferrer" href="https://dribbble.com/itsjohnnie" target="_blank" className="footer-link ui-inline-block"><div>Dribbble</div></a></li>
                <li><a rel="noreferrer" href="mailto:johnnie@hey.com?subject=Hello%20there%20%F0%9F%91%8B" className="footer-link ui-inline-block"><div>Email love</div></a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
