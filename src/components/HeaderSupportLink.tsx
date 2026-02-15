"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type HeaderSupportLinkProps = {
  className?: string;
  activeClassName?: string;
};

export default function HeaderSupportLink({
  className = "",
  activeClassName = "underline underline-offset-8",
}: HeaderSupportLinkProps) {
  const pathname = usePathname();
  const isSupportPage = pathname === "/support";

  return (
    <Link href="/support" className={`${className} ${isSupportPage ? activeClassName : ""}`.trim()}>
      Support
    </Link>
  );
}
