import Image from "next/image";

import styles from "./logo.module.css";

const logoWidth = 40;
const logoHeight = Math.round((42 / 108) * logoWidth);

type LogoProps = {
  className?: string;
  priority?: boolean;
  tone?: "adaptive" | "light";
};

export function Logo({
  className = "",
  priority = false,
  tone = "adaptive",
}: LogoProps) {
  return (
    <span
      className={`${styles.logo} ${tone === "light" ? styles.forceLight : ""} ${className}`.trim()}
    >
      <Image
        alt=""
        className={`${styles.image} ${styles.light}`}
        height={logoHeight}
        priority={priority}
        src="/images/dna.svg"
        width={logoWidth}
      />
      <Image
        alt=""
        className={`${styles.image} ${styles.dark}`}
        height={logoHeight}
        priority={priority}
        src="/images/dna_light.svg"
        width={logoWidth}
      />
    </span>
  );
}
