import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "small" | "medium" | "large";

type SharedButtonProps = {
  children: ReactNode;
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & SharedButtonProps;

type ButtonLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  SharedButtonProps;

function getClassName({
  className = "",
  fullWidth = false,
  size = "medium",
  variant = "primary",
}: Pick<ButtonProps, "className" | "fullWidth" | "size" | "variant">) {
  return [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  children,
  className = "",
  fullWidth = false,
  size = "medium",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={getClassName({ className, fullWidth, size, variant })}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  className = "",
  fullWidth = false,
  size = "medium",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={getClassName({ className, fullWidth, size, variant })} {...props}>
      {children}
    </Link>
  );
}
