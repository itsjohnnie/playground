// Shared by the index (/songs) and every song page (/songs/<slug>/) — the
// one place the section's stylesheet is pulled in.
import "./songs.css";

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
