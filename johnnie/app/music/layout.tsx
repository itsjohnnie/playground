// Shared by the index (/music) and every song page (/music/<slug>/) — the
// one place the section's stylesheet is pulled in.
import "./music.css";

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
