"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { organizerNavigation, publicNavigation, type UserRole } from "@/lib/navigation";
import { Chevron, PixelFlag } from "./pixel-icons";

export function SiteHeader({ role }: { role?: UserRole }) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const groups = role === "organizer" ? [...publicNavigation, organizerNavigation] : publicNavigation;

  function closeNavigation() {
    setOpenGroup(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!header.current?.contains(event.target as Node)) closeNavigation();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (openGroup) {
        setOpenGroup(null);
        triggers.current[openGroup]?.focus();
      } else if (mobileOpen) {
        setMobileOpen(false);
        mobileToggle.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup, mobileOpen]);

  return (
    <header className="site-header" ref={header} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) closeNavigation();
    }}>
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="CTF Platform, beranda" onClick={closeNavigation}>
          <PixelFlag width="30" height="30" /><span>CTF Platform</span>
        </Link>
        <button ref={mobileToggle} className="mobile-toggle" aria-expanded={mobileOpen} aria-controls="main-navigation" onClick={() => {
          setMobileOpen(!mobileOpen);
          setOpenGroup(null);
        }}>
          {mobileOpen ? "Tutup" : "Menu"}<span className="menu-symbol" aria-hidden="true">{mobileOpen ? "×" : "+"}</span>
        </button>
        <nav id="main-navigation" className="site-nav" aria-label="Navigasi utama" data-mobile-open={mobileOpen}>
          <ul className="nav-list">
            {groups.map((group) => {
              const expanded = openGroup === group.id;
              const current = group.columns.some((column) => column.links.some((link) => link.href.split(/[?#]/)[0] === pathname && pathname !== "/"));
              return (
                <li className="nav-group" key={group.id}>
                  <button className="nav-trigger" id={`nav-trigger-${group.id}`}
                    ref={(element) => { triggers.current[group.id] = element; }}
                    aria-expanded={expanded} aria-controls={`nav-panel-${group.id}`} data-current={current}
                    onClick={() => setOpenGroup(expanded ? null : group.id)}>
                    {group.label}<Chevron open={expanded} />
                  </button>
                  <div className="mega-panel" id={`nav-panel-${group.id}`} aria-labelledby={`nav-trigger-${group.id}`} hidden={!expanded}>
                    <div className="shell mega-inner">
                      {group.columns.map((column) => (
                        <div className="mega-column" key={column.title}>
                          <p className="mega-heading">{column.title}</p>
                          <ul>{column.links.map((link) => (
                            <li key={link.href}><Link href={link.href} aria-current={link.href === pathname ? "page" : undefined} onClick={closeNavigation}>{link.label}</Link></li>
                          ))}</ul>
                        </div>
                      ))}
                      <p className="mega-description">{group.description}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link className="button button-small header-account" href={role ? "/account" : "/login"} onClick={closeNavigation}>{role ? "Akun saya" : "Masuk"}</Link>
        </nav>
      </div>
    </header>
  );
}
