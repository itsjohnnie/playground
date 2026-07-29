// Turns a product name into a URL-safe slug: strips accents so "Hermès"
// becomes "hermes" rather than being dropped or percent-encoded, then
// collapses everything else non-alphanumeric (spaces, apostrophes,
// ampersands, parentheses) into single hyphens.
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
