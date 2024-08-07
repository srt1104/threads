"use client";

import Link from "next/link";
import Image from "next/image";
import { sidebarLinks } from "@/constants";
import { usePathname } from "next/navigation";

export default function BottomBar() {
  const pathname = usePathname();

  return (
    <section className="bottombar">
      <div className="bottombar_container">
        {sidebarLinks.map((link) => {
          const isActive =
            (pathname.includes(link.route) && link.route.length > 1) ||
            pathname === link.route;

          return (
            <Link
              key={link.label}
              href={link.route}
              className={`bottombar_link ${isActive && "bg-primary-500"}`}
            >
              <Image
                src={link.imgURL}
                alt={link.label}
                width={24}
                height={24}
              />

              <p className="text-center text-subtle-medium text-light-1 max-sm:hidden">
                {link.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
