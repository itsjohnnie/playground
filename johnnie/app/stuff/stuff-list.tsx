"use client";

import { Fragment, useMemo, useState } from "react";
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
  // status (default): things I have first (chronological), then the wishlist.
  return copy.sort((a, b) => Number(b.owned) - Number(a.owned) || byOrder(a, b));
}

export default function StuffList({ items }: { items: StuffItem[] }) {
  const [sort, setSort] = useState<SortMode>("status");
  const [open, setOpen] = useState<string | null>(null);
  const sorted = useMemo(() => sortItems(items, sort), [items, sort]);

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
        {sorted.map((it) => {
          const isOpen = open === it.name;
          const facts: [string, string][] = [
            ["Brand", it.brand],
            ["Status", it.owned ? "Owned" : "On the wishlist"],
            ["Price", it.price],
          ].filter(([, v]) => v) as [string, string][];
          const panelId = `stuff-panel-${it.order}`;
          return (
            <li
              key={it.name}
              className={`stuff-row${it.owned ? "" : " is-wish"}${isOpen ? " is-open" : ""}`}
            >
              <button
                type="button"
                className="stuff-rowbtn"
                onClick={() => setOpen(isOpen ? null : it.name)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="stuff-name">{it.name}</span>
                <span className="stuff-rowmeta">
                  <span className="stuff-cat">{it.category}</span>
                  <svg className="stuff-chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                    <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>

              <div className="stuff-panel" id={panelId} role="region">
                <div className="stuff-panel-in">
                  <div className="stuff-thumb">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset(it.image)} alt={it.name} loading="lazy" />
                    ) : (
                      <svg className="stuff-thumb-ph" viewBox="0 0 40 46" aria-hidden="true">
                        <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
                          <path d="M20 3 37 13v20L20 43 3 33V13z" />
                          <path d="M20 3v20M20 23 37 13M20 23 3 13" />
                        </g>
                      </svg>
                    )}
                  </div>

                  <div className="stuff-facts">
                    <dl className="stuff-facts-dl">
                      {facts.map(([k, v]) => (
                        <Fragment key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </Fragment>
                      ))}
                    </dl>
                    {it.description ? (
                      <p className="stuff-descr">{it.description}</p>
                    ) : (
                      <p className="stuff-descr stuff-descr--empty">
                        More on this soon.
                      </p>
                    )}
                    {it.link ? (
                      <a
                        className="stuff-get"
                        href={it.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get it →
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
