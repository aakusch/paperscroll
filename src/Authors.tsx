import { authorNames } from "./authorFormat";

type AuthorListProps = {
  authors: string;
  visible?: number;
};

export function AuthorList({ authors, visible = 3 }: AuthorListProps) {
  const names = authorNames(authors);
  if (names.length <= visible + 1) {
    return <span className="author-list">{authors}</span>;
  }

  const remaining = names.length - visible;
  return (
    <details className="author-disclosure">
      <summary>
        <span>{names.slice(0, visible).join(", ")}</span>
        <strong>+{remaining} authors</strong>
      </summary>
      <span className="author-list-full">{authors}</span>
    </details>
  );
}
