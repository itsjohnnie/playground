// Small line/fill icons for the view switcher — sized to sit right beside the
// sun/moon toggle. currentColor throughout so they follow the button's own
// color/opacity states (hover, active, dark mode) with no extra rules.

export function GridIcon() {
  return (
    <svg className="view-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1" fill="currentColor" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1" fill="currentColor" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1" fill="currentColor" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1" fill="currentColor" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg className="view-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="10" cy="10" rx="3" ry="7.25" stroke="currentColor" strokeWidth="1.1" />
      <path d="M2.75 10h14.5" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function CascadeIcon() {
  return (
    <svg className="view-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="7.5" width="10" height="7" rx="1" fill="currentColor" opacity=".35"
        transform="rotate(-9 7.5 11)" />
      <rect x="4.5" y="5.5" width="10" height="7" rx="1" fill="currentColor" opacity=".65"
        transform="rotate(-4.5 9.5 9)" />
      <rect x="6.5" y="3.5" width="10" height="7" rx="1" fill="currentColor" />
    </svg>
  );
}
