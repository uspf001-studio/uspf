"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PublicContentPage from "@/components/PublicContentPage";

type PageSlug =
  | "about"
  | "news"
  | "membership"
  | "president"
  | "teachers-protection"
  | "school-safety"
  | "child-protection";

type WebsitePage = {
  slug: PageSlug;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  introduction: string;
  hero_image_url: string | null;
  hero_image_border_width: number;
  is_published: boolean;
};

type PageSection = {
  id: string;
  page_slug: PageSlug;
  title: string;
  body: string;
  image_url: string | null;
  image_border_width: number;
  button_label: string | null;
  button_url: string | null;
  display_order: number;
  is_visible: boolean;
  isNew?: boolean;
};

const pageOptions: { slug: PageSlug; label: string }[] = [
  { slug: "about", label: "About USPF" },
  { slug: "news", label: "News & Media" },
  { slug: "membership", label: "Membership" },
  { slug: "president", label: "President's Desk" },
  { slug: "teachers-protection", label: "Teacher Protection" },
  { slug: "school-safety", label: "School Safety" },
  { slug: "child-protection", label: "Child Protection" },
];

function isValidDestination(value: string) {
  return value.startsWith("/")
    ? !value.startsWith("//")
    : /^https?:\/\/\S+$/i.test(value);
}

export default function PageStudio({ initialPage }: { initialPage: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [pageSlug, setPageSlug] = useState<PageSlug>(
    pageOptions.some((page) => page.slug === initialPage) ? initialPage as PageSlug : "about",
  );
  const [pageDraft, setPageDraft] = useState<WebsitePage | null>(null);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [sectionEditing, setSectionEditing] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [savingPage, setSavingPage] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadPages = useCallback(async () => {
    const [pageResult, sectionResult] = await Promise.all([
      supabase
        .from("website_pages")
        .select("slug, label, eyebrow, title, subtitle, introduction, hero_image_url, hero_image_border_width, is_published"),
      supabase
        .from("website_page_sections")
        .select("id, page_slug, title, body, image_url, image_border_width, button_label, button_url, display_order, is_visible")
        .order("display_order", { ascending: true }),
    ]);

    if (pageResult.error || sectionResult.error) {
      setNotice({
        type: "error",
        text: `Page content could not be loaded: ${pageResult.error?.message || sectionResult.error?.message}. Apply the visual website pages migration first.`,
      });
      return;
    }

    const pageRows = (pageResult.data || []) as WebsitePage[];
    const sectionRows = (sectionResult.data || []) as PageSection[];
    setPages(pageRows);
    setPageDraft(pageRows.find((page) => page.slug === pageSlug) || null);
    setHeroPreview(pageRows.find((page) => page.slug === pageSlug)?.hero_image_url || null);
    setSections(sectionRows.filter((section) => section.page_slug === pageSlug));
  }, [pageSlug, supabase]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (!heroPreview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(heroPreview);
  }, [heroPreview]);

  function choosePage(slug: PageSlug) {
    setPageSlug(slug);
    const page = pages.find((item) => item.slug === slug) || null;
    setPageDraft(page);
    setHeroPreview(page?.hero_image_url || null);
    setSections((current) => current.filter((section) => section.page_slug === slug));
    setSectionEditing(null);
    setHeroFile(null);
    setNotice(null);
  }

  function updateSection(id: string, updates: Partial<PageSection>) {
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...updates } : section));
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MB.");

    const signatureResponse = await fetch("/api/cloudinary-signature", { method: "POST" });
    const signature = await signatureResponse.json();
    if (!signatureResponse.ok) throw new Error(signature.error || "Cloudinary authorization failed.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.apiKey);
    formData.append("timestamp", String(signature.timestamp));
    formData.append("signature", signature.signature);
    formData.append("folder", signature.folder);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Image upload failed.");
    return result.secure_url as string;
  }

  async function savePage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pageDraft) return;
    setSavingPage(true);
    setNotice(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError || new Error("Administrator session is unavailable.");
      let heroImageUrl = pageDraft.hero_image_url;
      if (heroFile) {
        setUploadingHero(true);
        heroImageUrl = await uploadImage(heroFile);
      }

      const { error } = await supabase
        .from("website_pages")
        .update({
          eyebrow: pageDraft.eyebrow.trim(),
          title: pageDraft.title.trim(),
          subtitle: pageDraft.subtitle.trim(),
          introduction: pageDraft.introduction.trim(),
          hero_image_url: heroImageUrl,
          hero_image_border_width: pageDraft.hero_image_border_width,
          is_published: pageDraft.is_published,
          updated_at: new Date().toISOString(),
          updated_by: userData.user.id,
        })
        .eq("slug", pageSlug);
      if (error) throw error;

      setPageDraft({ ...pageDraft, hero_image_url: heroImageUrl });
      setHeroPreview(heroImageUrl);
      setHeroFile(null);
      setNotice({ type: "success", text: "Page settings saved." });
      await loadPages();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Page could not be saved." });
    } finally {
      setSavingPage(false);
      setUploadingHero(false);
    }
  }

  async function saveSection(section: PageSection) {
    if ((section.button_label && !section.button_url) || (!section.button_label && section.button_url)) {
      setNotice({ type: "error", text: "Provide both a button label and destination, or leave both blank." });
      return;
    }
    if (section.button_url && !isValidDestination(section.button_url.trim())) {
      setNotice({ type: "error", text: "Use a relative site path or an http:// or https:// button URL." });
      return;
    }

    setSavingSection(section.id);
    setNotice(null);
    const values = {
      page_slug: pageSlug,
      title: section.title.trim(),
      body: section.body.trim(),
      image_url: section.image_url?.trim() || null,
      image_border_width: section.image_border_width,
      button_label: section.button_label?.trim() || null,
      button_url: section.button_url?.trim() || null,
      display_order: section.display_order,
      is_visible: section.is_visible,
      updated_at: new Date().toISOString(),
    };
    const result = section.isNew
      ? await supabase.from("website_page_sections").insert(values).select("id").single()
      : await supabase.from("website_page_sections").update(values).eq("id", section.id);
    setSavingSection(null);

    if (result.error) {
      setNotice({ type: "error", text: `Section could not be saved: ${result.error.message}` });
      return;
    }
    if (section.isNew && result.data) {
      setSections((current) => current.map((item) => item.id === section.id
        ? { ...item, id: result.data.id, isNew: false }
        : item));
    } else {
      setSections((current) => current.map((item) => item.id === section.id ? { ...item, isNew: false } : item));
    }
    setSectionEditing(null);
    setNotice({ type: "success", text: "Section saved." });
    await loadPages();
  }

  async function removeSection(section: PageSection) {
    if (!window.confirm("Remove this page section?")) return;
    if (section.isNew) {
      setSections((current) => current.filter((item) => item.id !== section.id));
      return;
    }
    const { error } = await supabase.from("website_page_sections").delete().eq("id", section.id);
    if (error) {
      setNotice({ type: "error", text: `Section could not be removed: ${error.message}` });
      return;
    }
    setNotice({ type: "success", text: "Section removed." });
    await loadPages();
  }

  async function moveSection(section: PageSection, direction: -1 | 1) {
    const ordered = [...sections].sort((a, b) => a.display_order - b.display_order);
    const index = ordered.findIndex((item) => item.id === section.id);
    const other = ordered[index + direction];
    if (!other) return;

    const moved = ordered.map((item, itemIndex) => ({
      ...item,
      display_order: itemIndex === index ? other.display_order : itemIndex === index + direction ? section.display_order : item.display_order,
    }));
    setSections(moved);

    for (const item of [section, other]) {
      if (item.isNew) continue;
      const newOrder = item.id === section.id ? other.display_order : section.display_order;
      const { error } = await supabase
        .from("website_page_sections")
        .update({ display_order: newOrder, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) {
        setNotice({ type: "error", text: `Section order could not be saved: ${error.message}` });
        await loadPages();
        return;
      }
    }
  }

  async function uploadSectionImage(section: PageSection, file: File | undefined) {
    if (!file) return;
    setSavingSection(section.id);
    setNotice(null);
    try {
      const imageUrl = await uploadImage(file);
      updateSection(section.id, { image_url: imageUrl });
      setNotice({ type: "success", text: "Image uploaded. Save the section to publish it." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Image upload failed." });
    } finally {
      setSavingSection(null);
    }
  }

  function addSection() {
    const section: PageSection = {
      id: crypto.randomUUID(),
      page_slug: pageSlug,
      title: "",
      body: "",
      image_url: null,
      image_border_width: 12,
      button_label: null,
      button_url: null,
      display_order: sections.length + 1,
      is_visible: true,
      isNew: true,
    };
    setSections((current) => [...current, section]);
    setSectionEditing(section.id);
  }

  return (
    <main className="page-studio">
      <header className="page-studio-header">
        <div>
          <p className="eyebrow">WEBSITE MANAGEMENT / VISUAL STUDIO</p>
          <h1>Page Studio</h1>
          <p>Arrange page sections, edit content and preview the white-framed image layout.</p>
        </div>
        <Link href="/" target="_blank" rel="noreferrer" className="page-studio-button secondary">View website ↗</Link>
      </header>

      {notice && <p role={notice.type === "error" ? "alert" : "status"} className={`page-studio-notice ${notice.type}`}>{notice.text}</p>}

      <div className="page-studio-layout">
        <aside className="page-studio-sidebar" aria-label="Choose a page">
          <h2>Pages</h2>
          {pageOptions.map((option) => (
            <button type="button" key={option.slug} onClick={() => choosePage(option.slug)} className={pageSlug === option.slug ? "selected" : ""}>
              <span>{option.label}</span>
              <small>{pages.find((page) => page.slug === option.slug)?.is_published ? "Published" : "Unpublished"}</small>
            </button>
          ))}
          <Link href="/admin" className="page-studio-back">← Admin dashboard</Link>
        </aside>

        <div className="page-studio-workspace">
          {!pageDraft ? (
            <div className="page-studio-empty">No page settings were found. Apply the visual website pages migration before editing pages.</div>
          ) : (
            <>
              <form className="page-studio-settings" onSubmit={(event) => void savePage(event)}>
                <div className="page-studio-section-heading">
                  <div>
                    <p className="eyebrow">PAGE SETTINGS</p>
                    <h2>{pageDraft.label}</h2>
                  </div>
                  <label className="page-publish-toggle">
                    <input type="checkbox" checked={pageDraft.is_published} onChange={(event) => setPageDraft({ ...pageDraft, is_published: event.target.checked })} />
                    Published
                  </label>
                </div>
                <div className="page-studio-fields">
                  <label>Eyebrow<input value={pageDraft.eyebrow} onChange={(event) => setPageDraft({ ...pageDraft, eyebrow: event.target.value })} /></label>
                  <label>Page title<input required value={pageDraft.title} onChange={(event) => setPageDraft({ ...pageDraft, title: event.target.value })} /></label>
                  <label>Subtitle<input value={pageDraft.subtitle} onChange={(event) => setPageDraft({ ...pageDraft, subtitle: event.target.value })} /></label>
                  <label>Introduction<textarea rows={4} value={pageDraft.introduction} onChange={(event) => setPageDraft({ ...pageDraft, introduction: event.target.value })} /></label>
                </div>
                <div className="page-studio-image-settings">
                  <label>Hero image URL<input value={pageDraft.hero_image_url || ""} onChange={(event) => setPageDraft({ ...pageDraft, hero_image_url: event.target.value || null })} placeholder="Paste an image URL or upload below" /></label>
                  <label className="page-studio-upload">
                    Upload hero image
                    <input type="file" accept="image/*" onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setHeroFile(file);
                      setHeroPreview(file ? URL.createObjectURL(file) : pageDraft.hero_image_url);
                    }} />
                  </label>
                  <label className="page-studio-border-control">
                    <span>Hero image frame border: {pageDraft.hero_image_border_width}px</span>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={1}
                      value={pageDraft.hero_image_border_width}
                      aria-label="Hero image frame border width"
                      onChange={(event) => setPageDraft({ ...pageDraft, hero_image_border_width: Number(event.target.value) })}
                    />
                  </label>
                </div>
                {heroFile && <p className="page-studio-file">{heroFile.name} selected · image uploads up to 10 MB</p>}
                <div className="page-studio-actions">
                  <button className="page-studio-button" disabled={savingPage}>{savingPage ? uploadingHero ? "Uploading image..." : "Saving..." : "Save page settings"}</button>
                  <Link className="page-studio-button secondary" href={`/${pageSlug}`} target="_blank" rel="noreferrer">Preview page ↗</Link>
                </div>
              </form>

              <section className="page-studio-live-preview">
                <div className="page-studio-section-heading">
                  <div>
                    <p className="eyebrow">LIVE DESIGN PREVIEW</p>
                    <h2>Public page canvas</h2>
                  </div>
                  <span className="page-studio-live-label">Updates as you edit</span>
                </div>
                <div className="page-studio-canvas-frame">
                  <PublicContentPage
                    page={{ ...pageDraft, hero_image_url: heroPreview }}
                    sections={sections
                      .filter((section) => section.is_visible)
                      .sort((a, b) => a.display_order - b.display_order)}
                  />
                </div>
              </section>

              {pageSlug === "news" && <div className="page-studio-empty">News cards come from published articles. Edit or publish articles from the Admin Dashboard.</div>}

              <section className="page-studio-blocks">
                <div className="page-studio-section-heading">
                  <div>
                    <p className="eyebrow">PAGE CANVAS</p>
                    <h2>Content blocks</h2>
                    <p>Reorder blocks and add imagery, copy and optional buttons.</p>
                  </div>
                  <button type="button" className="page-studio-button" onClick={addSection}>＋ Add section</button>
                </div>

                {sections.length === 0 && <div className="page-studio-empty">No additional sections yet. Add a section to build this page.</div>}
                {sections.map((section, index) => {
                  const editing = sectionEditing === section.id;
                  return (
                    <article key={section.id} className="page-studio-block">
                      <div className="page-studio-block-controls">
                        <div>
                          <span className="page-studio-order">{String(index + 1).padStart(2, "0")}</span>
                          <span className="page-studio-block-title">{section.title || "Untitled section"}</span>
                        </div>
                        <div className="page-studio-actions">
                          <button type="button" aria-label="Move section up" disabled={index === 0} onClick={() => void moveSection(section, -1)}>↑</button>
                          <button type="button" aria-label="Move section down" disabled={index === sections.length - 1} onClick={() => void moveSection(section, 1)}>↓</button>
                          <button type="button" onClick={() => setSectionEditing(editing ? null : section.id)}>{editing ? "Close" : "Edit"}</button>
                        </div>
                      </div>
                      {editing ? (
                        <div className="page-studio-block-editor">
                          <div className="page-studio-fields">
                            <label>Section title<input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} /></label>
                            <label>Section copy<textarea rows={5} value={section.body} onChange={(event) => updateSection(section.id, { body: event.target.value })} /></label>
                            <label>Button label<input value={section.button_label || ""} onChange={(event) => updateSection(section.id, { button_label: event.target.value || null })} /></label>
                            <label>Button destination<input value={section.button_url || ""} onChange={(event) => updateSection(section.id, { button_url: event.target.value || null })} placeholder="/membership or https://example.com" /></label>
                            <label>Image URL<input value={section.image_url || ""} onChange={(event) => updateSection(section.id, { image_url: event.target.value || null })} /></label>
                            <label className="page-studio-upload">
                              Upload image
                              <input type="file" accept="image/*" onChange={(event) => void uploadSectionImage(section, event.target.files?.[0])} />
                            </label>
                            <label className="page-studio-border-control">
                              <span>Image frame border: {section.image_border_width}px</span>
                              <input
                                type="range"
                                min={0}
                                max={24}
                                step={1}
                                value={section.image_border_width}
                                aria-label={`${section.title || "Section"} image frame border width`}
                                onChange={(event) => updateSection(section.id, { image_border_width: Number(event.target.value) })}
                              />
                            </label>
                          </div>
                          <label className="page-publish-toggle"><input type="checkbox" checked={section.is_visible} onChange={(event) => updateSection(section.id, { is_visible: event.target.checked })} />Visible on public page</label>
                          <div className="page-studio-actions">
                            <button type="button" className="page-studio-button" disabled={savingSection === section.id} onClick={() => void saveSection(section)}>{savingSection === section.id ? "Saving..." : "Save section"}</button>
                            <button type="button" className="page-studio-button danger" onClick={() => void removeSection(section)}>Delete</button>
                          </div>
                        </div>
                      ) : (
                        <div className="page-studio-block-preview">
                          {section.image_url && <div className="page-studio-preview-frame"><Image src={section.image_url} alt="" fill unoptimized sizes="280px" /></div>}
                          <div>
                            <p>{section.body || "Add copy to preview this section."}</p>
                            {section.button_label && <span className="page-studio-preview-button">{section.button_label}</span>}
                            <small>{section.is_visible ? "Visible" : "Hidden"} on public page</small>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
