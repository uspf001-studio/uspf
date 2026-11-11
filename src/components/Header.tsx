"use client";

import Link from "next/link";
import { useState } from "react";
import SiteLogo from "@/components/SiteLogo";

export default function Header({
  toplineLocation = "Telangana • Educational Protection & Advocacy",
  toplineVision = "Rooted in Telangana. Inspired by a National Vision.",
}: {
  toplineLocation?: string;
  toplineVision?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: "/", label: "Home" },
    { href: "/#about", label: "About" },
    { href: "/#pillars", label: "Our Pillars" },
    { href: "/#leadership", label: "Leadership" },
    { href: "/#advocacy", label: "Advocacy" },
    { href: "/#structure", label: "Organization" },
    { href: "/#media", label: "Media" },
  ];

  return (
    <>
      <div className="uspf-topline">
        <div className="uspf-container">
          <span>{toplineLocation}</span>
          <span>{toplineVision}</span>
        </div>
      </div>
      <header className="uspf-site-header">
        <div className="uspf-container uspf-header-inner">
          <Link href="/" className="uspf-brand" onClick={() => setMenuOpen(false)}>
            <SiteLogo />
            <span>
              <strong>UNITED SCHOOLS<br />PROTECTION FORUM</strong>
              <small>UNITED FOR PROTECTION, TOGETHER FOR CHANGE</small>
            </span>
          </Link>
          <nav className={`uspf-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>
            ))}
          </nav>
          <Link className="uspf-header-cta" href="/#contact">Connect with USPF</Link>
          <button
            type="button"
            className="uspf-menu-toggle"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-site-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          </button>
        </div>
        <nav id="mobile-site-navigation" className={`uspf-mobile-nav${menuOpen ? " is-open" : ""}`} aria-label="Mobile navigation">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          <Link className="uspf-mobile-cta" href="/#contact" onClick={() => setMenuOpen(false)}>Connect with USPF</Link>
        </nav>
      </header>
    </>
  );
}
