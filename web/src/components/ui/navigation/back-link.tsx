import { ArrowLeft } from "lucide-react";
import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import styles from "./back-link.module.css";

type BackLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: ReactNode;
  };

export function BackLink({ children, className = "", ...props }: BackLinkProps) {
  return (
    <Link className={[styles.backLink, className].filter(Boolean).join(" ")} {...props}>
      <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.25} />
      <span>{children}</span>
    </Link>
  );
}
