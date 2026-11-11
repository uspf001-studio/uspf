"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeSiteTheme } from "@/lib/site-theme";

type ThemeSettings = {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  header_color: string;
  footer_color: string;
  button_color: string;
  font_family: string;
};

type Announcement = {
  id: string;
  message: string;
  link_url: string | null;
  background_color: string;
  text_color: string;
  scroll_mode: "left" | "right" | "center";
};

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
const allowedFonts = new Set(["DM Sans", "Manrope", "Inter", "Arial", "Georgia", "Roboto"]);

function isSafeLink(value: string | null): value is string {
  if (!value) return false;
  return value.startsWith("/")
    ? !value.startsWith("//")
    : /^https?:\/\/\S+$/i.test(value);
}

function isExternalLink(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export default function WebsiteLiveSettings() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const supabase = createClient();
    let mounted = true;

    async function loadWebsiteSettings() {
      try {
        const [themeResult, announcementResult] = await Promise.all([
          supabase
            .from("site_settings")
            .select("primary_color, secondary_color, background_color, text_color, header_color, footer_color, button_color, font_family")
            .eq("id", 1)
            .maybeSingle(),
          supabase
            .from("announcement_lines")
            .select("id, message, link_url, background_color, text_color, scroll_mode")
            .eq("is_active", true)
            .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
            .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
            .order("display_order", { ascending: true }),
        ]);

        if (themeResult.error) {
          console.error("Website theme could not be loaded:", themeResult.error.message);
        } else if (themeResult.data && mounted) {
          const theme = normalizeSiteTheme(themeResult.data as ThemeSettings);
          const colorEntries: [keyof ThemeSettings, string][] = [
            ["primary_color", "--site-primary"],
            ["secondary_color", "--site-secondary"],
            ["background_color", "--site-background"],
            ["text_color", "--site-text"],
            ["header_color", "--site-header"],
            ["footer_color", "--site-footer"],
            ["button_color", "--site-button"],
          ];
          const root = document.documentElement;
          for (const [field, variable] of colorEntries) {
            if (hexColorPattern.test(theme[field])) {
              root.style.setProperty(variable, theme[field]);
            } else {
              console.error(`Ignoring invalid ${field} value from site settings.`);
            }
          }
          if (allowedFonts.has(theme.font_family)) {
            root.style.setProperty("--site-font", theme.font_family);
          } else {
            console.error("Ignoring unsupported font family from site settings.");
          }
        }

        if (
          announcementResult.error
          && announcementResult.error.message.includes("scroll_mode")
          && (announcementResult.error.message.includes("does not exist") || announcementResult.error.message.includes("schema cache"))
        ) {
          const legacyResult = await supabase
            .from("announcement_lines")
            .select("id, message, link_url, background_color, text_color")
            .eq("is_active", true)
            .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
            .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
            .order("display_order", { ascending: true });

          if (legacyResult.error) {
            console.error("Website announcements could not be loaded:", legacyResult.error.message);
          } else if (mounted) {
            setAnnouncements((legacyResult.data || []).filter(
              (item) => hexColorPattern.test(item.background_color) && hexColorPattern.test(item.text_color),
            ).map((item) => ({ ...item, scroll_mode: "left" as const })) as Announcement[]);
          }
        } else if (announcementResult.error) {
          console.error("Website announcements could not be loaded:", announcementResult.error.message);
        } else if (mounted) {
          setAnnouncements((announcementResult.data || []).filter(
            (item) => hexColorPattern.test(item.background_color) && hexColorPattern.test(item.text_color),
          ) as Announcement[]);
        }
      } catch (error) {
        console.error("Website live settings refresh failed:", error);
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadWebsiteSettings();
    };

    void loadWebsiteSettings();
    window.addEventListener("pageshow", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      mounted = false;
      window.removeEventListener("pageshow", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [pathname]);

  if (pathname.startsWith("/admin") || announcements.length === 0) return null;

  return (
    <div role="region" aria-label="USPF announcements" className="w-full">
      {announcements.map((item) => (
        <div
          key={item.id}
          className="uspf-announcement"
          style={{ backgroundColor: item.background_color, color: item.text_color }}
        >
          <div className="uspf-announcement-track" data-scroll-mode={item.scroll_mode || "left"}>
            <span className="uspf-announcement-copy">
              {isSafeLink(item.link_url) ? (
                <a
                  className="uspf-announcement-link"
                  href={item.link_url}
                  target={isExternalLink(item.link_url) ? "_blank" : undefined}
                  rel={isExternalLink(item.link_url) ? "noreferrer" : undefined}
                  aria-label={isExternalLink(item.link_url) ? `${item.message} (opens in a new tab)` : item.message}
                >
                  {item.message}
                </a>
              ) : item.message}
              <span aria-hidden="true">　◆　</span>
            </span>
            <span className="uspf-announcement-copy" aria-hidden="true">
              {isSafeLink(item.link_url) ? <a className="uspf-announcement-link" href={item.link_url} tabIndex={-1}>{item.message}</a> : item.message}
              <span>　◆　</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
