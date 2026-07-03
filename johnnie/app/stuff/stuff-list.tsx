"use client";

import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import type { StuffItem } from "@/lib/content";
import { asset } from "@/lib/asset";

type SortMode = "status" | "category" | "az";

function sortItems(items: StuffItem[], mode: SortMode): StuffItem[] {
  const byOrder = (a: StuffItem, b: StuffItem) => a.order - b.order;
  const copy = [...items];
  if (mode === "az") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === "category")
    return copy.sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        Number(b.owned) - Number(a.owned) ||
        byOrder(a, b),
    );
  return copy.sort((a, b) => Number(b.owned) - Number(a.owned) || byOrder(a, b));
}

function IsoCube() {
  return (
    <svg className="stuff-thumb-ph" viewBox="0 0 40 46" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M20 3 37 13v20L20 43 3 33V13z" />
        <path d="M20 3v20M20 23 37 13M20 23 3 13" />
      </g>
    </svg>
  );
}

export default function StuffList({ items }: { items: StuffItem[] }) {
  const [sort, setSort] = useState<SortMode>("status");
  // Track the item by index into `sorted` so swiping can walk the list.
  const [idx, setIdx] = useState<number | null>(null);
  const [open, setOpen] = useState(false); // drives the enter/exit animation
  const [dir, setDir] = useState(0); // last nav direction: 1 next, -1 prev, 0 none
  const sorted = useMemo(() => sortItems(items, sort), [items, sort]);
  const shown = idx == null ? null : sorted[idx];

  const openItem = (i: number) => {
    setDir(0);
    setIdx(i);
    requestAnimationFrame(() => setOpen(true));
  };
  const close = () => {
    setOpen(false);
    setTimeout(() => setIdx(null), 240);
  };
  // Move to the previous/next item (clamped at the ends).
  const go = (d: number) => {
    setIdx((cur) => {
      if (cur == null) return cur;
      const n = cur + d;
      if (n < 0 || n >= sorted.length) return cur;
      setDir(d);
      return n;
    });
  };

  // Escape/arrow keys, and lock body scroll while the modal is up.
  useEffect(() => {
    if (idx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, sorted.length]);

  // Horizontal swipe to page between items (ignores mostly-vertical scrolls).
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      go(dx < 0 ? 1 : -1);
    }
  };

  // Pokédex-style stat block: brand, any extra specs (dimensions, weight…),
  // then price and status. Empty values are dropped.
  const facts = (it: StuffItem): [string, string][] =>
    (
      [
        ["Brand", it.brand],
        ...it.specs.map((s) => [s.label, s.value] as [string, string]),
        ["Price", it.price],
        ["Status", it.owned ? "Owned" : "On the wishlist"],
      ] as [string, string][]
    ).filter(([, v]) => v);

  return (
    <>
      <div className="stuff-titlerow">
        <h1>Stuff</h1>
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

      <p className="stuff-desc">
        Things I have — and things I&#x27;ll have, one day. The dimmed ones are
        still on the list.
      </p>

      <ul className="stuff-grid" role="list">
        {sorted.map((it, i) => (
          <li key={it.name} className={`stuff-row${it.owned ? "" : " is-wish"}`}>
            <button
              type="button"
              className="stuff-rowbtn"
              onClick={() => openItem(i)}
            >
              <span className="stuff-name">{it.name}</span>
              <span className="stuff-rowmeta">
                <span className="stuff-cat">{it.category}</span>
                <svg className="stuff-info" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="10" cy="6.4" r="1.05" fill="currentColor" />
                  <path d="M10 9.1v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {shown && (
        <div className={`stuff-modal${open ? " is-open" : ""}`} onClick={close}>
          <div
            className="stuff-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={shown.name}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button
              type="button"
              className="stuff-modal-x"
              onClick={close}
              aria-label="Close"
            >
              <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                <path d="M2 2l10 10M12 2 2 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            {/* Keyed so each item change remounts and plays the slide-in. */}
            <div
              key={idx}
              className="stuff-modal-scroll"
              data-dir={dir > 0 ? "next" : dir < 0 ? "prev" : "none"}
            >
              <div className="stuff-modal-inner">
                <div className="stuff-modal-media">
                  {shown.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset(shown.image)} alt={shown.name} />
                  ) : (
                    <IsoCube />
                  )}
                </div>

                <div className="stuff-modal-body">
                  <div className="stuff-modal-head">
                    <h2>{shown.name}</h2>
                    <span className="stuff-cat">{shown.category}</span>
                  </div>
                  <dl className="stuff-facts-dl">
                    {facts(shown).map(([k, v]) => (
                      <div className="stuff-fact" key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {shown.description ? (
                    <p className="stuff-descr">{shown.description}</p>
                  ) : (
                    <p className="stuff-descr stuff-descr--empty">More on this soon.</p>
                  )}
                  {shown.link ? (
                    <a
                      className="stuff-get"
                      href={shown.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shown.cta || "Buy it"} →
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
