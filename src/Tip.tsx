import { useState, type ReactNode } from "react";

export function Tip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={open ? "tip open" : "tip"}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="tip-hit"
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      <span className="tip-bubble" role="tooltip">
        {label}
      </span>
    </span>
  );
}
