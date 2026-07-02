"use client";

import { useMemo, useState } from "react";
import type { StuffItem } from "@/lib/content";

type SortMode = "status" | "category" | "az";

function sortItems(items: StuffItem[], mode: SortMode): StuffItem[] {
  const byOrder = (a: StuffItem, b: StuffItem) => a.order - b.order;
  const copy = [...items];
  if (mode === "az") {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === "category") {
    return copy.sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        Number(b.owned) - Number(a.owned) ||
        byOrder(a, b),
    );
  }
  // status (default): things I have first (chronological), then the wishlist.
  return copy.sort(
    (a, b) => Number(b.owned) - Number(a.owned) || byOrder(a, b),
  );
}

export default function StuffList({ items }: { items: StuffItem[] }) {
  const [sort, setSort] = useState<SortMode>("status");
  const sorted = useMemo(() => sortItems(items, sort), [items, sort]);

  return (
    <>
      <div className="stuff-toolbar">
        <label className="stuff-sort">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Sort items"
          >
            <option value="status">Have first</option>
            <option value="category">Category</option>
            <option value="az">A–Z</option>
          </select>
        </label>
      </div>

      <ul className="stuff-grid" role="list">
        {sorted.map((it) => (
          <li key={it.name} className={`stuff-row${it.owned ? "" : " is-wish"}`}>
            <span className="stuff-namewrap">
              <span className="stuff-name">{it.name}</span>
              {it.link ? (
                <a
                  className="stuff-info"
                  href={it.link}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`More about ${it.name}`}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="12" cy="7.75" r="1.05" fill="currentColor" />
                  </svg>
                </a>
              ) : null}
            </span>
            <span className="stuff-cat">{it.category}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
