import type { ReactNode } from "react";

interface ListEmptyStateProps {
  /** Ikona (např. Lucide) nad nadpisom */
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /** Vnútri už ohraničenej karty — bez vlastného rámu */
  embedded?: boolean;
}

export function ListEmptyState({
  icon,
  title,
  description,
  children,
  className = "",
  embedded = false,
}: ListEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
      style={
        embedded
          ? undefined
          : {
              borderColor: "var(--color-border-strong)",
              backgroundColor: "var(--color-bg-subtle)",
              borderWidth: 1,
              borderStyle: "solid",
              borderRadius: "1rem",
            }
      }
    >
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </p>
      {description && (
        <p className="text-xs mt-1 max-w-md" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </p>
      )}
      {children ? <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
