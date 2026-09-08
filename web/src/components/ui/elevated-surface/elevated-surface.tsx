import {
  createElement,
  forwardRef,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./elevated-surface.module.css";

type ElevatedSurfaceProps = HTMLAttributes<HTMLElement> &
  Pick<FormHTMLAttributes<HTMLFormElement>, "action" | "method"> & {
    as?: "button" | "div" | "form" | "header" | "li" | "section";
    type?: "button" | "submit" | "reset";
    children: ReactNode;
  };

export const ElevatedSurface = forwardRef<HTMLElement, ElevatedSurfaceProps>(
  function ElevatedSurface({ as = "div", children, className = "", ...props }, ref) {
    return createElement(
      as,
      {
        ...props,
        className: `${styles.surface} ${className}`.trim(),
        ref,
      },
      children,
    );
  },
);
