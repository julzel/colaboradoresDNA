import Image from "next/image";

import styles from "./logo.module.css";

const logoWidth = 40;
const logoHeight = Math.round((42 / 108) * logoWidth);

type LogoProps = {
  className?: string;
  priority?: boolean;
};

export function Logo({ className = "", priority = false }: LogoProps) {
  return (
    <Image
      alt=""
      className={`${styles.logo} ${className}`.trim()}
      height={logoHeight}
      priority={priority}
      src="/images/dna.svg"
      width={logoWidth}
    />
  );
}
