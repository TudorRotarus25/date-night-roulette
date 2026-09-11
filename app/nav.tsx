"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  /** Matches nested routes too — /restaurants/[id] keeps Pool lit. */
  match: (pathname: string) => boolean;
  icon: React.ReactNode;
};

const TABS: Tab[] = [
  {
    href: "/",
    label: "Spin",
    match: (p) => p === "/",
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-3.4-7.05" />
        <path d="M21 3v6h-6" />
      </>
    ),
  },
  {
    href: "/restaurants",
    label: "Pool",
    match: (p) => p.startsWith("/restaurants"),
    icon: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <circle cx="3.5" cy="6" r="1.2" />
        <circle cx="3.5" cy="12" r="1.2" />
        <circle cx="3.5" cy="18" r="1.2" />
      </>
    ),
  },
  {
    href: "/add",
    label: "Add",
    match: (p) => p === "/add",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    href: "/benched",
    label: "Benched",
    match: (p) => p === "/benched",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 9v6M14 9v6" />
      </>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  // /login is pre-auth — there is nowhere to navigate to yet.
  if (pathname === "/login") return null;

  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul>
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="nav-tab"
                aria-current={active ? "page" : undefined}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {tab.icon}
                </svg>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
