"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  const [shown, setShown] = useState<StuffItem | null>(null); // modal content
  const [open, setOpen] = useState(false); // drives the enter/exit animation
  const sorted = useMemo(() => sortItems(items, sort), [items, sort]);

  const openItem = (it: StuffItem) => {
    setShown(it);
    requestAnimationFrame(() => setOpen(true));
  };
  const close = () => {
    setOpen(false);
    setTimeout(() => setShown(null), 220);
  };

  // Escape to close + lock body scroll while the modal is up.
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [shown]);

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
        still on the list. Tap an item for the details.
      </p>

      <ul className="stuff-grid" role="list">
        {sorted.map((it) => (
          <li key={it.name} className={`stuff-row${it.owned ? "" : " is-wish"}`}>
            <button
              type="button"
              className="stuff-rowbtn"
              onClick={() => openItem(it)}
            >
              <span className="stuff-name">{it.name}</span>
              <span className="stuff-rowmeta">
                <span className="stuff-cat">{it.category}</span>
                <svg className="stuff-arrow" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                  <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {shown && (
        <div
          className={`stuff-modal${open ? " is-open" : ""}`}
          onClick={close}
        >
          <div
            className="stuff-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={shown.name}
            onClick={(e) => e.stopPropagation()}
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
                  <Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </Fragment>
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
      )}
    </>
  );
}
