import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT = path.join(process.cwd(), "content");

export type Project = {
  order: number;
  title: string;
  tag: string;
  poster: string;
  video: string;
  award_text: string;
  award_url: string;
};

export type Feature = {
  order: number;
  title: string;
  category: string;
  url: string;
};

export type DiscoverItem = {
  order: number;
  name: string;
  category: string;
  image: string;
};

export type StuffItem = {
  order: number;
  name: string;
  category: string;
  // Owned = full opacity; not owned (wishlist / someday) = dimmed.
  owned: boolean;
  // Expanded detail card (all optional — fill in over time via the CMS):
  brand: string;
  price: string;
  description: string;
  image: string; // isometric render on a white background
  // "Get it" link.
  link: string;
};

function readCollection<T>(dir: string): T[] {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md"))
    .map((f) => matter(fs.readFileSync(path.join(full, f), "utf8")).data as T)
    .sort((a, b) => (a as { order: number }).order - (b as { order: number }).order);
}

export function getProjects(): Project[] {
  return readCollection<Project>("projects");
}

export function getFeatures(): Feature[] {
  return readCollection<Feature>("features");
}

export function getDiscover(): DiscoverItem[] {
  return readCollection<DiscoverItem>("discover");
}

export function getStuff(): StuffItem[] {
  return readCollection<StuffItem>("stuff");
}
