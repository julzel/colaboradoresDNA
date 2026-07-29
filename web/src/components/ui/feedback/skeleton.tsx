import type { CSSProperties, ReactNode } from "react";

import styles from "./skeleton.module.css";

type SkeletonProps = {
  className?: string;
  height?: CSSProperties["height"];
  variant?: "block" | "circle" | "line";
  width?: CSSProperties["width"];
};

type LoadingRegionProps = {
  children: ReactNode;
  className?: string;
  label?: string;
};

export function Skeleton({
  className = "",
  height,
  variant = "block",
  width,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, styles[variant], className]
        .filter(Boolean)
        .join(" ")}
      style={{ height, width }}
    />
  );
}

export function LoadingRegion({
  children,
  className = "",
  label = "Cargando contenido",
}: LoadingRegionProps) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only" role="status">
        {label}
      </span>
      {children}
    </div>
  );
}
