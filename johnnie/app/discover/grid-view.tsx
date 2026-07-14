import { asset } from "@/lib/asset";
import type { DiscoverItem } from "@/lib/content";
import DiscoverGrid from "./discover-grid";

// View 1 — the original endless grid: unchanged, just relocated so it can
// live alongside the globe and cascade views under <DiscoverExperience>.
// Server-rendered source pool (`.hero-item` children of `.hero-list`); the
// client script in discover-grid.tsx clones these into a torus-wrapped grid.
export default function GridView({ items }: { items: DiscoverItem[] }) {
  return (
    <div className="hero">
      <div className="hero-list-wrapper">
        <div role="list" className="hero-list">
          {items.map((it) => (
            <div role="listitem" className="hero-item" key={it.image}>
              <img
                src={asset(it.image)}
                loading="eager"
                alt=""
                className="hero-image"
              />
              <div className="hero-meta_data">
                <div>{it.name}</div>
                <div className="hero-meta_data-lighter">{it.category}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <DiscoverGrid />
    </div>
  );
}
