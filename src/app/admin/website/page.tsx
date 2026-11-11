"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { defaultSiteTheme, normalizeSiteTheme } from "@/lib/site-theme";

type ThemeSettings = {
  id: number;
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
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
};

type AnnouncementDraft = Omit<Announcement, "id">;

const defaultTheme: ThemeSettings = { id: 1, ...defaultSiteTheme };

const colorFields: {
  key: keyof Omit<ThemeSettings, "id" | "font_family">;
  label: string;
}[] = [
  { key: "primary_color", label: "Primary colour" },
  { key: "secondary_color", label: "Secondary colour" },
  { key: "background_color", label: "Background colour" },
  { key: "text_color", label: "Text colour" },
  { key: "header_color", label: "Header colour" },
  { key: "footer_color", label: "Footer colour" },
  { key: "button_color", label: "Button colour" },
];

const fontFamilies = ["DM Sans", "Manrope", "Inter", "Arial", "Georgia", "Roboto"];
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

const emptyAnnouncement: AnnouncementDraft = {
  message: "",
  link_url: null,
  background_color: "#0c1c34",
  text_color: "#ffffff",
  scroll_mode: "left",
  is_active: true,
  display_order: 1,
  starts_at: null,
  ends_at: null,
};

function isValidWebsiteUrl(value: string) {
  return value.startsWith("/")
    ? !value.startsWith("//")
    : /^https?:\/\/\S+$/i.test(value);
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function WebsiteSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scrollModeSupported, setScrollModeSupported] = useState(true);
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyAnnouncement);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [savingLogo, setSavingLogo] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const [themeResult, announcementResult] = await Promise.all([
        supabase
          .from("site_settings")
          .select("id, primary_color, secondary_color, background_color, text_color, header_color, footer_color, button_color, font_family, logo_url")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("announcement_lines")
          .select("id, message, link_url, background_color, text_color, scroll_mode, is_active, display_order, starts_at, ends_at")
          .order("display_order", { ascending: true }),
      ]);

      if (themeResult.error) {
        setNotice({ type: "error", text: `Theme loading failed: ${themeResult.error.message}` });
      } else if (themeResult.data) {
        const { logo_url, ...themeSettings } = themeResult.data;
        setTheme({ id: 1, ...normalizeSiteTheme(themeSettings as ThemeSettings) });
        setLogoUrl(logo_url || null);
        setLogoPreview(logo_url || "");
      }

      if (announcementResult.error) {
        if (
          announcementResult.error.message.includes("scroll_mode")
          && (announcementResult.error.message.includes("does not exist") || announcementResult.error.message.includes("schema cache"))
        ) {
          const legacyResult = await supabase
            .from("announcement_lines")
            .select("id, message, link_url, background_color, text_color, is_active, display_order, starts_at, ends_at")
            .order("display_order", { ascending: true });

          setScrollModeSupported(false);
          if (legacyResult.error) {
            setNotice({ type: "error", text: `Announcement loading failed: ${legacyResult.error.message}` });
          } else {
            setAnnouncements((legacyResult.data || []).map((item) => ({
              ...item,
              scroll_mode: "left" as const,
            })) as Announcement[]);
            setNotice({
              type: "error",
              text: "Announcement scrolling controls need the latest database migration. Existing announcements are available; new ones will scroll from right to left by default.",
            });
          }
        } else {
          setNotice({ type: "error", text: `Announcement loading failed: ${announcementResult.error.message}` });
        }
      } else {
        setScrollModeSupported(true);
        setAnnouncements((announcementResult.data || []) as Announcement[]);
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? `Website settings loading failed: ${error.message}` : "Website settings loading failed.",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!logoPreview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  function chooseLogo(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice({ type: "error", text: "Choose an image file for the logo." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNotice({ type: "error", text: "Choose a logo smaller than 10 MB." });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setNotice(null);
  }

  async function uploadLogo(file: File) {
    const signatureResponse = await fetch("/api/cloudinary-signature", { method: "POST" });
    const signature = await signatureResponse.json();
    if (!signatureResponse.ok) {
      throw new Error(signature.error || "Cloudinary authorization failed.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.apiKey);
    formData.append("timestamp", String(signature.timestamp));
    formData.append("signature", signature.signature);
    formData.append("folder", signature.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
      { method: "POST", body: formData },
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || "Logo upload failed.");
    }
    return result.secure_url as string;
  }

  async function saveLogo() {
    setSavingLogo(true);
    setNotice(null);
    try {
      const nextLogoUrl = logoFile ? await uploadLogo(logoFile) : logoUrl;
      const { error } = await supabase
        .from("site_settings")
        .update({ logo_url: nextLogoUrl })
        .eq("id", 1);
      if (error) throw error;

      setLogoUrl(nextLogoUrl);
      setLogoPreview(nextLogoUrl || "");
      setLogoFile(null);
      setNotice({ type: "success", text: nextLogoUrl ? "Logo saved successfully." : "Logo removed." });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? `Logo save failed: ${error.message}` : "Logo save failed.",
      });
    } finally {
      setSavingLogo(false);
    }
  }

  async function removeLogo() {
    setSavingLogo(true);
    setNotice(null);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({ logo_url: null })
        .eq("id", 1);
      if (error) throw error;

      setLogoUrl(null);
      setLogoFile(null);
      setLogoPreview("");
      setNotice({ type: "success", text: "Logo removed." });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? `Logo removal failed: ${error.message}` : "Logo removal failed.",
      });
    } finally {
      setSavingLogo(false);
    }
  }

  function updateTheme(key: keyof ThemeSettings, value: string) {
    setTheme((previous) => ({ ...previous, [key]: value }));
  }

  async function persistTheme(nextTheme: ThemeSettings, successText: string) {
    for (const field of colorFields) {
      if (!hexColorPattern.test(nextTheme[field.key])) {
        setNotice({ type: "error", text: `${field.label} must be a valid HEX colour (for example #102B50).` });
        return;
      }
    }
    if (!fontFamilies.includes(nextTheme.font_family)) {
      setNotice({ type: "error", text: "Choose a supported font family." });
      return;
    }

    setSavingTheme(true);
    setNotice(null);
    const { error } = await supabase
      .from("site_settings")
      .upsert(nextTheme, { onConflict: "id" });
    setSavingTheme(false);

    if (error) {
      setNotice({ type: "error", text: `Theme save failed: ${error.message}` });
      return;
    }

    setTheme(nextTheme);
    setNotice({ type: "success", text: successText });
  }

  async function saveTheme() {
    await persistTheme(theme, "Theme settings saved successfully.");
  }

  async function resetTheme() {
    await persistTheme(defaultTheme, "Theme reset to the USPF homepage palette.");
  }

  function updateAnnouncement<K extends keyof AnnouncementDraft>(
    key: K,
    value: AnnouncementDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function editAnnouncement(item: Announcement) {
    setEditingId(item.id);
    setDraft({
      message: item.message,
      link_url: item.link_url,
      background_color: item.background_color,
      text_color: item.text_color,
      scroll_mode: item.scroll_mode || "left",
      is_active: item.is_active,
      display_order: item.display_order,
      starts_at: toLocalDateTime(item.starts_at),
      ends_at: toLocalDateTime(item.ends_at),
    });
    setNotice(null);
  }

  function cancelAnnouncementEdit() {
    setEditingId(null);
    setDraft({ ...emptyAnnouncement, display_order: announcements.length + 1 });
  }

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.message.trim();
    const rawLinkUrl = draft.link_url?.trim() || "";
    const linkUrl = rawLinkUrl ? normalizeWebsiteUrl(rawLinkUrl) : null;

    if (!message) {
      setNotice({ type: "error", text: "Enter announcement text before saving." });
      return;
    }
    if (!hexColorPattern.test(draft.background_color) || !hexColorPattern.test(draft.text_color)) {
      setNotice({ type: "error", text: "Announcement colours must be valid HEX values." });
      return;
    }
    if (linkUrl && !isValidWebsiteUrl(linkUrl)) {
      setNotice({ type: "error", text: "Use a site path (for example /about) or a website address (for example example.com)." });
      return;
    }
    if (!Number.isInteger(draft.display_order) || draft.display_order < 0) {
      setNotice({ type: "error", text: "Display order must be a non-negative whole number." });
      return;
    }
    if (draft.starts_at && draft.ends_at && new Date(draft.starts_at) > new Date(draft.ends_at)) {
      setNotice({ type: "error", text: "The end date must be after the start date." });
      return;
    }

    const values: AnnouncementDraft = {
      ...draft,
      message,
      link_url: linkUrl,
      starts_at: toIsoDateTime(draft.starts_at || ""),
      ends_at: toIsoDateTime(draft.ends_at || ""),
    };

    setSavingAnnouncement(true);
    setNotice(null);
    const announcementValues: Partial<AnnouncementDraft> = { ...values };
    if (!scrollModeSupported) delete announcementValues.scroll_mode;
    const result = editingId
      ? await supabase.from("announcement_lines").update(announcementValues).eq("id", editingId)
      : await supabase.from("announcement_lines").insert(announcementValues);
    setSavingAnnouncement(false);

    if (result.error) {
      setNotice({ type: "error", text: `Announcement save failed: ${result.error.message}` });
      return;
    }

    setNotice({ type: "success", text: editingId ? "Announcement updated." : "Announcement added." });
    cancelAnnouncementEdit();
    await loadSettings();
  }

  async function toggleAnnouncement(item: Announcement) {
    setNotice(null);
    const { error } = await supabase
      .from("announcement_lines")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      setNotice({ type: "error", text: `Announcement update failed: ${error.message}` });
      return;
    }
    setNotice({ type: "success", text: `Announcement ${item.is_active ? "disabled" : "enabled"}.` });
    await loadSettings();
  }

  async function deleteAnnouncement(id: string) {
    if (!window.confirm("Delete this announcement? This cannot be undone.")) return;

    const { error } = await supabase.from("announcement_lines").delete().eq("id", id);
    if (error) {
      setNotice({ type: "error", text: `Announcement deletion failed: ${error.message}` });
      return;
    }
    if (editingId === id) cancelAnnouncementEdit();
    setNotice({ type: "success", text: "Announcement deleted." });
    await loadSettings();
  }

  if (loading) {
    return <main className="min-h-screen bg-gray-50 p-8 text-gray-600">Loading website settings...</main>;
  }

  return (
    <main className="min-h-screen space-y-8 bg-gray-50 p-4 md:p-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[#9a7835]">Website Management</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Website Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage USPF colours, fonts and scheduled announcements.</p>
      </header>

      {notice && (
        <div
          role="status"
          className={`rounded-lg border p-3 text-sm ${
            notice.type === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {notice.text}
        </div>
      )}

      <section id="theme" className="scroll-mt-6 space-y-5 rounded-xl border bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Theme &amp; Colours</h2>
          <p className="text-sm text-gray-500">Choose the visual settings used throughout the public website.</p>
        </div>

        <section className="space-y-4 rounded-lg border p-4" aria-labelledby="logo-upload-title">
          <div>
            <h3 id="logo-upload-title" className="font-semibold text-gray-900">Website logo</h3>
            <p className="text-sm text-gray-500">Upload the logo shown in the public website header and footer and the admin workspace.</p>
          </div>
          <div className="flex min-h-24 items-center justify-center rounded-lg bg-[#101f3c] p-4">
            {logoPreview ? (
              <Image src={logoPreview} alt="Logo preview" width={180} height={56} unoptimized className="h-14 w-auto object-contain" />
            ) : (
              <div className="logo-mark">U</div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium">
              Choose logo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => chooseLogo(event.target.files?.[0] || null)}
              />
            </label>
            <button type="button" onClick={() => void saveLogo()} disabled={savingLogo} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {savingLogo ? "Saving..." : "Save logo"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => void removeLogo()}
                disabled={savingLogo}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                Remove logo
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">Use an image file up to 10 MB. Save the selected image to publish it.</p>
        </section>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {colorFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">{field.label}</label>
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <input
                  type="color"
                  aria-label={`${field.label} colour picker`}
                  value={hexColorPattern.test(theme[field.key]) ? theme[field.key] : "#000000"}
                  onChange={(event) => updateTheme(field.key, event.target.value)}
                  className="h-10 w-14 cursor-pointer"
                />
                <input
                  id={field.key}
                  type="text"
                  value={theme[field.key]}
                  onChange={(event) => updateTheme(field.key, event.target.value)}
                  className="w-full rounded border p-2 text-sm uppercase"
                  maxLength={7}
                  aria-describedby={`${field.key}-hint`}
                />
              </div>
              <p id={`${field.key}-hint`} className="text-xs text-gray-500">Enter a 6-digit HEX value, such as #102B50.</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 sm:max-w-sm">
          <label htmlFor="font-family" className="block text-sm font-medium text-gray-700">Font family</label>
          <select
            id="font-family"
            value={theme.font_family}
            onChange={(event) => updateTheme("font_family", event.target.value)}
            className="w-full rounded-lg border p-3"
          >
            {fontFamilies.map((family) => <option key={family} value={family}>{family}</option>)}
          </select>
        </div>

        <div
          className="overflow-hidden rounded-xl border"
          style={{ backgroundColor: theme.background_color, fontFamily: theme.font_family }}
        >
          <div className="p-4 font-semibold text-white" style={{ backgroundColor: theme.header_color }}>
            USPF — Website Preview
          </div>
          <div className="space-y-3 p-6" style={{ color: theme.text_color }}>
            <h3 className="text-xl font-bold" style={{ color: theme.primary_color }}>
              Protecting educators. Strengthening institutions.
            </h3>
            <p>United Schools Protection Forum</p>
            <button type="button" className="rounded-lg px-5 py-2 font-semibold" style={{ backgroundColor: theme.button_color, color: theme.header_color }}>
              Become a Member
            </button>
          </div>
          <div className="p-3 text-sm text-white" style={{ backgroundColor: theme.footer_color }}>
            USPF — Footer Preview
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={saveTheme} disabled={savingTheme} className="rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white disabled:opacity-50">
            {savingTheme ? "Saving..." : "Save Theme"}
          </button>
          <button onClick={resetTheme} disabled={savingTheme} className="rounded-lg border px-6 py-3 font-semibold text-gray-700 disabled:opacity-50">
            Restore USPF Default Colours
          </button>
        </div>
      </section>

      <section id="announcements" className="scroll-mt-6 space-y-5 rounded-xl border bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scrolling Announcements</h2>
          <p className="text-sm text-gray-500">Create messages that display above the public website header.</p>
        </div>

        <form onSubmit={saveAnnouncement} className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">{editingId ? "Edit announcement" : "Add announcement"}</h3>
          <div>
            <label htmlFor="announcement-message" className="mb-1 block text-sm font-medium">Announcement text</label>
            <textarea
              id="announcement-message"
              required
              rows={3}
              value={draft.message}
              onChange={(event) => updateAnnouncement("message", event.target.value)}
              className="w-full rounded-lg border p-3"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="announcement-link" className="mb-1 block text-sm font-medium">Optional link</label>
              <input
                id="announcement-link"
                type="text"
                value={draft.link_url || ""}
                onChange={(event) => updateAnnouncement("link_url", event.target.value || null)}
                placeholder="/news or https://example.com"
                className="w-full rounded-lg border p-3"
              />
              <p className="mt-1 text-xs text-gray-500">Site paths and website addresses are clickable on the public announcement bar. Website addresses can be entered with or without https://.</p>
            </div>
            <div>
              <label htmlFor="display-order" className="mb-1 block text-sm font-medium">Display order</label>
              <input
                id="display-order"
                type="number"
                min={0}
                step={1}
                value={draft.display_order}
                onChange={(event) => updateAnnouncement("display_order", Number(event.target.value))}
                className="w-full rounded-lg border p-3"
              />
            </div>
            <div>
              <label htmlFor="announcement-scroll-mode" className="mb-1 block text-sm font-medium">Announcement display</label>
              <select
                id="announcement-scroll-mode"
                value={draft.scroll_mode}
                onChange={(event) => updateAnnouncement("scroll_mode", event.target.value as AnnouncementDraft["scroll_mode"])}
                disabled={!scrollModeSupported}
                className="w-full rounded-lg border p-3"
              >
                <option value="left">Scroll from right to left</option>
                <option value="right">Scroll from left to right</option>
                <option value="center">Keep text centered (no scrolling)</option>
              </select>
              {!scrollModeSupported && (
                <p className="mt-1 text-xs text-amber-700">Apply the latest announcement migration to enable this setting.</p>
              )}
            </div>
            <div>
              <label htmlFor="announcement-start" className="mb-1 block text-sm font-medium">Start date and time (optional)</label>
              <input
                id="announcement-start"
                type="datetime-local"
                value={draft.starts_at || ""}
                onChange={(event) => updateAnnouncement("starts_at", event.target.value || null)}
                className="w-full rounded-lg border p-3"
              />
            </div>
            <div>
              <label htmlFor="announcement-end" className="mb-1 block text-sm font-medium">End date and time (optional)</label>
              <input
                id="announcement-end"
                type="datetime-local"
                value={draft.ends_at || ""}
                onChange={(event) => updateAnnouncement("ends_at", event.target.value || null)}
                className="w-full rounded-lg border p-3"
              />
            </div>
            {([
              ["background_color", "Background colour"],
              ["text_color", "Text colour"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label htmlFor={`announcement-${key}`} className="mb-1 block text-sm font-medium">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label={`${label} picker`}
                    value={hexColorPattern.test(draft[key]) ? draft[key] : "#000000"}
                    onChange={(event) => updateAnnouncement(key, event.target.value)}
                    className="h-12 w-14 cursor-pointer rounded border"
                  />
                  <input
                    id={`announcement-${key}`}
                    type="text"
                    value={draft[key]}
                    onChange={(event) => updateAnnouncement(key, event.target.value)}
                    maxLength={7}
                    className="min-w-0 flex-1 rounded-lg border p-3 uppercase"
                  />
                </div>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(event) => updateAnnouncement("is_active", event.target.checked)}
            />
            Enabled (will appear only within its scheduled dates)
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={savingAnnouncement} className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {savingAnnouncement ? "Saving..." : editingId ? "Save Changes" : "Add Announcement"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelAnnouncementEdit} className="rounded-lg border px-5 py-3 font-semibold">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div>
          <h3 className="mb-3 font-semibold">Live preview</h3>
          <div
            className="overflow-hidden whitespace-nowrap rounded"
            style={{ backgroundColor: draft.background_color, color: draft.text_color }}
          >
            <div
              className="uspf-announcement-track py-3"
              data-scroll-mode={draft.scroll_mode}
              style={{ animationDuration: "18s" }}
            >
              <span className="uspf-announcement-copy">{draft.message.trim() || "Your announcement will scroll here."}<span aria-hidden="true">　◆　</span></span>
              <span className="uspf-announcement-copy" aria-hidden="true">{draft.message.trim() || "Your announcement will scroll here."}<span>　◆　</span></span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Existing announcements</h3>
          {announcements.length === 0 && <p className="text-sm text-gray-500">No announcements added yet.</p>}
          {announcements.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-medium text-gray-800">{item.message}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Order {item.display_order}
                  {` · ${item.scroll_mode === "center" ? "Centered" : `Scroll ${item.scroll_mode}`}`}
                  {item.starts_at ? ` · Starts ${new Date(item.starts_at).toLocaleString()}` : ""}
                  {item.ends_at ? ` · Ends ${new Date(item.ends_at).toLocaleString()}` : ""}
                </p>
                {item.link_url && <p className="mt-1 break-all text-xs text-blue-700">{item.link_url}</p>}
                <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${item.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {item.is_active ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => editAnnouncement(item)} className="rounded-lg border px-3 py-2 text-sm">
                  Edit
                </button>
                <button type="button" onClick={() => void toggleAnnouncement(item)} className="rounded-lg border px-3 py-2 text-sm">
                  {item.is_active ? "Disable" : "Enable"}
                </button>
                <button type="button" onClick={() => void deleteAnnouncement(item.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
