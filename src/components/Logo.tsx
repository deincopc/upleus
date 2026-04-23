import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  href?: string;
  /** Display height of the logo mark in px. */
  height?: number;
  /** Set to true when on a dark background — inverts the emerald mark to white. */
  dark?: boolean;
  className?: string;
}

export function Logo({ href = "/", height = 28, dark = false, className = "" }: LogoProps) {
  const img = (
    <Image
      src="/logo.png"
      alt="Upleus"
      width={915}
      height={241}
      priority
      className={className}
      style={{
        height: `${height}px`,
        width: "auto",
        display: "block",
        filter: dark ? "brightness(0) invert(1)" : undefined,
      }}
    />
  );

  return href ? <Link href={href} style={{ lineHeight: 0, display: "inline-block" }}>{img}</Link> : img;
}
