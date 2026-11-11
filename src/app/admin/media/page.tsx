
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ImagePlus, Video, Trash2, Upload, Images,
  Loader2, RefreshCw
} from "lucide-react";

type MediaItem = {
  id: string;
  title: string | null;
  media_type: "image" | "video" | "youtube";
  cloudinary_url: string | null;
  public_id: string | null;
  category: string;
  created_at: string;
};

export default function MediaManager() {
  const supabase = createClient();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [files, setFiles] = useState<File[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadMedia() {
    const { data, error } = await supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setItems((data || []) as MediaItem[]);
  }

  useEffect(() => {
    loadMedia();
  }, []);

  async function uploadMedia() {
    if (!files.length) {
      setMessage("Please select at least one file.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      for (const file of files) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");

        if (!isVideo && !isImage) {
          throw new Error(`Unsupported file: ${file.name}`);
        }

        const signatureResponse = await fetch(
          "/api/cloudinary-signature",
          { method: "POST" }
        );

        const signatureData = await signatureResponse.json();

        if (!signatureResponse.ok) {
          throw new Error(signatureData.error || "Signature failed");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signatureData.apiKey);
        formData.append("timestamp", String(signatureData.timestamp));
        formData.append("signature", signatureData.signature);
        formData.append("folder", signatureData.folder);

        const resourceType = isVideo ? "video" : "image";

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${resourceType}/upload`,
          { method: "POST", body: formData }
        );

        const uploaded = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploaded.error?.message || "Cloudinary upload failed");
        }

        const { error } = await supabase.from("media").insert({
          title: title.trim() || file.name,
          media_type: resourceType,
          cloudinary_url: uploaded.secure_url,
          public_id: uploaded.public_id,
          category
        });

        if (error) {
          throw new Error(
            `File uploaded but database save failed: ${error.message}. Cloudinary ID: ${uploaded.public_id}`
          );
        }
      }

      setFiles([]);
      setTitle("");
      setMessage("Media uploaded successfully!");
      await loadMedia();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteMedia(item: MediaItem) {
    if (!confirm("Delete this media permanently?")) return;

    const response = await fetch("/api/media/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id })
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Delete failed");
      return;
    }

    setMessage("Media deleted successfully.");
    await loadMedia();
  }

  const visibleItems = items.filter(item => {
    if (filter === "all") return true;
    return item.media_type === filter;
  });

  return (
    <main className="min-h-screen bg-[#f4f6fa] p-5 md:p-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow">USPF OWNER WORKSPACE</div>
            <h1 className="mt-3 text-3xl font-bold text-[#101f3c]">
              Media Library
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage photographs and videos for the USPF website.
            </p>
          </div>

          <button
            onClick={loadMedia}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <section className="mb-9 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-[#101f3c] p-3 text-white">
              <Upload size={21} />
            </div>
            <div>
              <h2 className="font-bold text-[#101f3c]">
                Upload new media
              </h2>
              <p className="text-xs text-gray-500">
                Select photographs or video files.
              </p>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium">
            Media title
          </label>
          <input
            className="field"
            placeholder="Example: USPF State Meeting"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <label className="mb-2 block text-sm font-medium">
            Category
          </label>
          <select
            className="field"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option>General</option>
            <option>Teachers Protection</option>
            <option>School Safety</option>
            <option>Child Protection</option>
            <option>Government Meetings</option>
            <option>Press Releases</option>
            <option>Events</option>
          </select>

          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c7a45a] bg-[#fcfaf5] p-5 text-center">
            <ImagePlus size={32} className="mb-3 text-[#a7833e]" />
            <strong className="text-sm text-[#101f3c]">
              Select images or videos
            </strong>
            <span className="mt-2 text-xs text-gray-500">
              You can select multiple files
            </span>
            <input
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              multiple
              className="hidden"
              onChange={e => setFiles(Array.from(e.target.files || []))}
            />
          </label>

          {files.length > 0 && (
            <p className="mt-3 text-sm text-gray-600">
              {files.length} file(s) selected: {files.map(f => f.name).join(", ")}
            </p>
          )}

          <button
            onClick={uploadMedia}
            disabled={loading || !files.length}
            className="mt-5 flex items-center gap-2 rounded-lg bg-[#101f3c] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="animate-spin" size={17} /> Uploading...</>
              : <><Upload size={17} /> Upload to Cloudinary</>}
          </button>

          {message && (
            <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-[#101f3c]">
              {message}
            </p>
          )}
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Images className="text-[#a7833e]" />
              <h2 className="text-xl font-bold text-[#101f3c]">
                Uploaded media ({items.length})
              </h2>
            </div>

            <select
              className="rounded-lg border bg-white p-2 text-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">All media</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map(item => (
              <article
                key={item.id}
                className="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                <div className="relative aspect-video bg-gray-100">
                  {item.media_type === "video" ? (
                    <video
                      src={item.cloudinary_url || ""}
                      controls
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.cloudinary_url || ""}
                      alt={item.title || "USPF media"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-[#101f3c]">
                    {item.title || "Untitled"}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.category} · {item.media_type}
                  </p>

                  <button
                    onClick={() => deleteMedia(item)}
                    className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-600"
                  >
                    <Trash2 size={15} /> Delete media
                  </button>
                </div>
              </article>
            ))}
          </div>

          {visibleItems.length === 0 && (
            <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-gray-500">
              No media uploaded yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
