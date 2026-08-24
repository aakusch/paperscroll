type IconProps = { className?: string };

export function IconGit({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 .2a8 8 0 0 0-2.5 15.6c.4.1.5-.2.5-.4v-1.5c-2 .4-2.5-.8-2.5-.8-.3-.8-.8-1-1-1-.8-.5 0-.5 0-.5.9.1 1.4.9 1.4.9.8 1.4 2.1 1 2.6.8.1-.6.3-1 .6-1.2-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.2-.1-.2-.4-1.1.1-2.2 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.5 1.1.2 2 .1 2.2.5.6.8 1.3.8 2.2 0 3.1-1.9 3.8-3.7 4 .3.3.6.8.6 1.6v2.4c0 .2.1.5.5.4A8 8 0 0 0 8 .2"
      />
    </svg>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.6 1.5h2.2L9.7 7.2 16 14.5h-4.9L7.4 9.8 3 14.5H.8l6.5-6.2L0 1.5h5l3.3 4.3 4.3-4.3Zm-.8 11.7h1.2L4.3 2.7H3L11.8 13.2Z"
      />
    </svg>
  );
}

export function IconLinkedIn({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.3 1.6A1.3 1.3 0 1 0 2.3 4.2 1.3 1.3 0 0 0 2.3 1.6ZM1.2 5.3h2.2V14.5H1.2Zm4.1 0h2.1v1.3h.1c.3-.6 1-1.5 2.2-1.5 2.3 0 2.8 1.5 2.8 3.5v5.9H10.3V9.3c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7v5.3H5.3Z"
      />
    </svg>
  );
}
