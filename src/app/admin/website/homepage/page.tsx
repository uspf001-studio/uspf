"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import HomepageContentManager from "@/app/admin/website/homepage/HomepageContentManager";

type HomepageSlide = {
  id: string;
  tag: string;
  heading: string;
  accent_heading: string;
  description: string;
  image_url: string;
  button_text: string;
  button_url: string;
  is_visible: boolean;
  display_order: number;
  frame_border_width: number;
  image_border_width: number;
};

type SlideDraft = Omit<HomepageSlide, "id">;

const defaultDraft: SlideDraft = {
  tag: "USPF / OUR MISSION",
  heading: "",
  accent_heading: "",
  description: "",
  image_url: "",
  button_text: "EXPLORE OUR MISSION",
  button_url: "/",
  is_visible: true,
  display_order: 1,
  frame_border_width: 12,
  image_border_width: 10,
};

function isValidDestination(value: string) {
  return value.startsWith("/")
    ? !value.startsWith("//")
    : /^https?:\/\/\S+$/i.test(value);
}

export default function HomepageManagerPage() {
  const supabase = useMemo(() => createClient(), []);
  const [slides, setSlides] = useState<HomepageSlide[]>([]);
  const [draft, setDraft] = useState<SlideDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSlides = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("homepage_slides")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        setNotice({ type: "error", text: `Homepage slides could not be loaded: ${error.message}` });
      } else {
        setSlides((data || []) as HomepageSlide[]);
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? `Homepage slides could not be loaded: ${error.message}` : "Homepage slides could not be loaded.",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadSlides();
  }, [loadSlides]);

  useEffect(() => {
    if (!imagePreview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function startEditing(slide: HomepageSlide) {
    setEditingId(slide.id);
    setDraft({
      tag: slide.tag,
      heading: slide.heading,
      accent_heading: slide.accent_heading,
      description: slide.description,
      image_url: slide.image_url,
      button_text: slide.button_text,
      button_url: slide.button_url,
      is_visible: slide.is_visible,
      display_order: slide.display_order,
      frame_border_width: slide.frame_border_width,
      image_border_width: slide.image_border_width,
    });
    setSelectedImage(null);
    setImagePreview(slide.image_url);
    setNotice(null);
  }

  function resetForm() {
    setEditingId(null);
    setDraft({ ...defaultDraft, display_order: slides.length + 1 });
    setSelectedImage(null);
    setImagePreview("");
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice({ type: "error", text: "Choose an image file." });
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNotice({ type: "error", text: "Choose an image smaller than 10 MB." });
      event.target.value = "";
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setNotice(null);
  }

  async function uploadImage(file: File) {
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
      throw new Error(result.error?.message || "Image upload failed.");
    }
    return result.secure_url as string;
  }

  async function saveSlide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.heading.trim() || (!draft.image_url.trim() && !selectedImage)) {
      setNotice({ type: "error", text: "A heading and hero image are required." });
      return;
    }
    if (!draft.button_text.trim() || !draft.button_url.trim() || !isValidDestination(draft.button_url.trim())) {
      setNotice({ type: "error", text: "Enter button text and a relative URL or http(s) destination." });
      return;
    }
    if (!Number.isInteger(draft.display_order) || draft.display_order < 0) {
      setNotice({ type: "error", text: "Display order must be a non-negative whole number." });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      let imageUrl = draft.image_url.trim();
      if (selectedImage) {
        setUploading(true);
        imageUrl = await uploadImage(selectedImage);
        setUploading(false);
      }

      const values = {
        ...draft,
        heading: draft.heading.trim(),
        accent_heading: draft.accent_heading.trim(),
        description: draft.description.trim(),
        image_url: imageUrl,
        button_text: draft.button_text.trim(),
        button_url: draft.button_url.trim(),
      };
      const result = editingId
        ? await supabase.from("homepage_slides").update(values).eq("id", editingId)
        : await supabase.from("homepage_slides").insert(values);

      if (result.error) throw result.error;
      setNotice({ type: "success", text: editingId ? "Homepage slide updated." : "Homepage slide added." });
      resetForm();
      await loadSlides();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Homepage slide could not be saved.",
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function toggleVisibility(slide: HomepageSlide) {
    const { error } = await supabase
      .from("homepage_slides")
      .update({ is_visible: !slide.is_visible })
      .eq("id", slide.id);

    if (error) {
      setNotice({ type: "error", text: `Visibility update failed: ${error.message}` });
      return;
    }
    setNotice({ type: "success", text: `Slide ${slide.is_visible ? "hidden" : "published"}.` });
    await loadSlides();
  }

  async function deleteSlide(slide: HomepageSlide) {
    if (!window.confirm(`Delete "${slide.heading}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("homepage_slides").delete().eq("id", slide.id);
    if (error) {
      setNotice({ type: "error", text: `Slide deletion failed: ${error.message}` });
      return;
    }
    if (editingId === slide.id) resetForm();
    setNotice({ type: "success", text: "Homepage slide deleted." });
    await loadSlides();
  }

  if (loading) {
    return <main className="min-h-screen bg-gray-50 p-8 text-gray-600">Loading homepage slides...</main>;
  }

  return (
    <main className="min-h-screen space-y-8 bg-gray-50 p-4 md:p-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[#9a7835]">Website Management</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Homepage Manager</h1>
        <p className="mt-1 text-sm text-gray-500">Manage hero content, Cloudinary images, visibility and slide order.</p>
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

      <HomepageContentManager />

      <form onSubmit={saveSlide} className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{editingId ? "Edit hero slide" : "Add hero slide"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="slide-tag" className="mb-1 block text-sm font-medium">Eyebrow / slide label</label>
            <input id="slide-tag" value={draft.tag} onChange={(event) => setDraft({ ...draft, tag: event.target.value })} className="w-full rounded-lg border p-3" />
          </div>
          <div>
            <label htmlFor="slide-heading" className="mb-1 block text-sm font-medium">Heading</label>
            <input id="slide-heading" required value={draft.heading} onChange={(event) => setDraft({ ...draft, heading: event.target.value })} className="w-full rounded-lg border p-3" />
          </div>
          <div>
            <label htmlFor="slide-accent" className="mb-1 block text-sm font-medium">Accent heading (optional)</label>
            <input id="slide-accent" value={draft.accent_heading} onChange={(event) => setDraft({ ...draft, accent_heading: event.target.value })} className="w-full rounded-lg border p-3" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="slide-description" className="mb-1 block text-sm font-medium">Description</label>
            <textarea id="slide-description" rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="w-full rounded-lg border p-3" />
          </div>
          <div>
            <label htmlFor="slide-button-text" className="mb-1 block text-sm font-medium">Button text</label>
            <input id="slide-button-text" required value={draft.button_text} onChange={(event) => setDraft({ ...draft, button_text: event.target.value })} className="w-full rounded-lg border p-3" />
          </div>
          <div>
            <label htmlFor="slide-button-url" className="mb-1 block text-sm font-medium">Button destination URL</label>
            <input id="slide-button-url" required value={draft.button_url} onChange={(event) => setDraft({ ...draft, button_url: event.target.value })} className="w-full rounded-lg border p-3" placeholder="/about or https://example.com" />
          </div>
          <div>
            <label htmlFor="slide-order" className="mb-1 block text-sm font-medium">Display order</label>
            <input id="slide-order" type="number" min={0} step={1} value={draft.display_order} onChange={(event) => setDraft({ ...draft, display_order: Number(event.target.value) })} className="w-full rounded-lg border p-3" />
          </div>
          <label htmlFor="slide-frame-border" className="grid gap-2 text-sm font-medium">
            <span>Outer frame border: {draft.frame_border_width}px</span>
            <input id="slide-frame-border" type="range" min={0} max={24} step={1} value={draft.frame_border_width} onChange={(event) => setDraft({ ...draft, frame_border_width: Number(event.target.value) })} />
          </label>
          <label htmlFor="slide-image-border" className="grid gap-2 text-sm font-medium">
            <span>Inner image border: {draft.image_border_width}px</span>
            <input id="slide-image-border" type="range" min={0} max={24} step={1} value={draft.image_border_width} onChange={(event) => setDraft({ ...draft, image_border_width: Number(event.target.value) })} />
          </label>
        </div>

        <div>
          <label htmlFor="slide-image" className="mb-2 block text-sm font-medium">Hero image (uploaded securely to Cloudinary)</label>
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c7a45a] bg-[#fcfaf5] p-5 text-center">
            {imagePreview ? (
              <Image src={imagePreview} alt="Hero image preview" width={1200} height={600} unoptimized className="max-h-64 w-full rounded-lg object-cover" />
            ) : (
              <>
                <ImagePlus size={32} className="mb-2 text-[#9a7835]" aria-hidden="true"/>
                <strong>Choose a hero image</strong>
                <span className="mt-1 text-xs text-gray-500">Image files up to 10 MB</span>
              </>
            )}
            <input id="slide-image" type="file" accept="image/*" className="sr-only" onChange={chooseImage} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.is_visible} onChange={(event) => setDraft({ ...draft, is_visible: event.target.checked })} />
          Visible on the public homepage
        </label>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {saving ? <><Loader2 size={17} className="animate-spin"/>{uploading ? "Uploading image..." : "Saving..."}</> : editingId ? "Save Changes" : "Add Slide"}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-lg border px-5 py-3 font-semibold">Cancel</button>}
        </div>
      </form>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Homepage slides ({slides.length})</h2>
        {slides.length === 0 && <p className="rounded-lg border bg-white p-5 text-sm text-gray-500">No hero slides are configured yet.</p>}
        {slides.map((slide) => (
          <article key={slide.id} className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-center">
            <Image src={slide.image_url} alt="" width={448} height={288} unoptimized className="h-36 w-full rounded-lg object-cover md:w-56" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{slide.tag} · Order {slide.display_order}</p>
              <h3 className="mt-1 text-lg font-bold">{slide.heading} <span className="text-[#9a7835]">{slide.accent_heading}</span></h3>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{slide.description}</p>
              <p className="mt-2 text-xs text-gray-500">{slide.button_text} → {slide.button_url}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${slide.is_visible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                {slide.is_visible ? "Visible" : "Hidden"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => startEditing(slide)} className="rounded-lg border px-3 py-2 text-sm">Edit</button>
              <button type="button" onClick={() => void toggleVisibility(slide)} className="rounded-lg border px-3 py-2 text-sm">{slide.is_visible ? "Hide" : "Show"}</button>
              <button type="button" onClick={() => void deleteSlide(slide)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">Delete</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
