export function authorNames(authors: string) {
  return authors
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function compactAuthors(authors: string, visible = 2) {
  const names = authorNames(authors);
  if (names.length <= visible) return authors;
  return `${names.slice(0, visible).join(", ")} +${names.length - visible}`;
}
