import Image from "next/image";

import dnatureLogo from "../../../../assets/images/dnature-logo.svg";

import styles from "./logo.module.css";

const logoWidth = 40;
const logoHeight = Math.round((dnatureLogo.height / dnatureLogo.width) * logoWidth);

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
      src={dnatureLogo}
      width={logoWidth}
    />
  );
}
