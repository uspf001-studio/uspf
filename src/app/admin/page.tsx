
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SiteLogo from "@/components/SiteLogo";
import {
  ImagePlus, Newspaper, FileText, Globe,
  Loader2, Eye, LogOut, Settings, Palette, Megaphone,
  House, UserRound, Images
} from "lucide-react";

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  cover_image: string | null;
  created_at: string;
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("News");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setPosts((data || []) as Post[]);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  function chooseCover(file: File | null) {
    setCover(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  async function uploadCover() {
    if (!cover) return null;

    const signatureResponse = await fetch(
      "/api/cloudinary-signature",
      { method: "POST" }
    );

    const signature = await signatureResponse.json();

    if (!signatureResponse.ok) {
      throw new Error(signature.error || "Cloudinary authentication failed");
    }

    const formData = new FormData();
    formData.append("file", cover);
    formData.append("api_key", signature.apiKey);
    formData.append("timestamp", String(signature.timestamp));
    formData.append("signature", signature.signature);
    formData.append("folder", signature.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Image upload failed");
    }

    return result.secure_url as string;
  }

  async function publishPost(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const finalSlug = makeSlug(slug);

      if (!finalSlug || !title.trim()) {
        throw new Error("Headline and URL slug are required.");
      }

      // Check duplicate URL slug
      const { data: existing, error: checkError } = await supabase
        .from("posts")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        throw new Error("This URL slug already exists. Please change it.");
      }

      let imageUrl: string | null = null;

      if (cover) {
        imageUrl = await uploadCover();
      }

      const { error } = await supabase.from("posts").insert({
        title: title.trim(),
        slug: finalSlug,
        category,
        summary,
        body,
        cover_image: imageUrl,
        video_url: videoUrl || null,
        status,
        published_at: status === "published"
          ? new Date().toISOString()
          : null
      });

      if (error) throw error;

      setMessage(
        status === "published"
          ? "Article published successfully!"
          : "Draft saved successfully!"
      );

      setTitle("");
      setSlug("");
      setSummary("");
      setBody("");
      setVideoUrl("");
      setCover(null);
      setPreview("");
      setStatus("draft");

      await loadPosts();

    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save article"
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] md:grid md:grid-cols-[250px_1fr]">

      <aside className="bg-[#101f3c] p-6 text-white">
        <div className="mb-10 flex items-center gap-3">
          <SiteLogo />
          <div>
            <strong>USPF ADMIN</strong>
            <p className="text-xs text-gray-400">CONTENT STUDIO</p>
          </div>
        </div>

        <nav className="space-y-4 text-sm">
          <Link className="block rounded-lg bg-white/10 p-3" href="/admin">
            ▣ Dashboard
          </Link>
          <Link className="block p-3" href="/admin/media">
            ▧ Media Library
          </Link>
          <Link className="block p-3" href="/admin/website">
            <Settings className="mr-2 inline" size={16}/> Website Management
          </Link>
          <Link className="block p-3" href="/admin#news">
            ▤ News & Updates
          </Link>
        </nav>

        <button
          onClick={logout}
          className="mt-12 flex items-center gap-2 text-sm text-gray-300"
        >
          <LogOut size={16}/> Sign out
        </button>
      </aside>

      <main className="min-w-0 p-5 md:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">OWNER WORKSPACE</p>
            <h1 className="mt-3 text-3xl font-bold text-[#101f3c]">
              Content Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage and publish official USPF updates.
            </p>
          </div>

          <a href="/" target="_blank" className="rounded-lg border bg-white px-4 py-3 text-sm">
            <Eye className="mr-2 inline" size={16}/>
            View Website
          </a>
        </div>

        <section className="mb-10" aria-labelledby="website-management-title">
          <div className="mb-4">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#9a7835]">
              Website Management
            </p>
            <h2 id="website-management-title" className="mt-2 text-2xl font-bold text-[#101f3c]">
              Manage the public website
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "Website Settings", detail: "Colours, fonts and announcements", href: "/admin/website", Icon: Settings },
              { title: "Theme & Colours", detail: "Customize your visual identity", href: "/admin/website#theme", Icon: Palette },
              { title: "Scrolling Announcements", detail: "Schedule messages for visitors", href: "/admin/website#announcements", Icon: Megaphone },
              { title: "Homepage Manager", detail: "Edit hero slides and ordering", href: "/admin/website/homepage", Icon: House },
              { title: "Visual Page Studio", detail: "Design page sections, images and content", href: "/admin/website/pages", Icon: Palette },
              { title: "President's Desk", detail: "Manage leadership content", href: "/admin/website/pages?page=president", Icon: UserRound },
              { title: "Gallery Manager", detail: "Organize images and videos", href: "/admin/media", Icon: Images },
              { title: "Government Representations", detail: "Track submissions, statuses and public records", href: "/admin/representations", Icon: FileText },
              { title: "News & Updates", detail: "Create and publish articles", href: "/admin#news", Icon: Newspaper },
            ].map(({ title: cardTitle, detail, href, Icon }) => (
              <Link
                key={cardTitle}
                href={href}
                className="group rounded-xl border border-[#e7eaf0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c7a45a] hover:shadow-md"
              >
                <Icon className="mb-4 text-[#9a7835]" size={22} aria-hidden="true"/>
                <h3 className="font-bold text-[#101f3c]">{cardTitle}</h3>
                <p className="mt-1 text-sm text-gray-500">{detail}</p>
              </Link>
            ))}
          </div>
        </section>

        <form id="news" onSubmit={publishPost} className="mx-auto max-w-4xl space-y-6">

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <FileText className="text-[#b38e48]" size={24}/>
              <h2 className="text-xl font-bold text-[#101f3c]">
                Article Information
              </h2>
            </div>

            <label className="mb-2 block text-sm font-semibold">
              01. URL Slug
            </label>

            <input
              className="field"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="uspf-state-level-meeting"
              required
            />

            <p className="mb-5 -mt-3 text-xs text-gray-500">
              URL preview: /news/{makeSlug(slug) || "your-article-name"}
            </p>

            <label className="mb-2 block text-sm font-semibold">
              02. Article Headline
            </label>

            <input
              className="field"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                setSlug(makeSlug(e.target.value));
              }}
              placeholder="Enter article headline"
              required
            />

            <label className="mb-2 block text-sm font-semibold">
              03. Category
            </label>

            <select
              className="field"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option>News</option>
              <option>Press Release</option>
              <option>Government Meeting</option>
              <option>Teachers Protection</option>
              <option>School Safety</option>
              <option>Child Protection</option>
              <option>Events</option>
              <option>Media Coverage</option>
            </select>

            <label className="mb-2 block text-sm font-semibold">
              04. Short Description
            </label>

            <textarea
              className="field"
              rows={3}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Write a short introduction..."
            />
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <ImagePlus className="text-[#b38e48]" size={24}/>
              <h2 className="text-xl font-bold text-[#101f3c]">
                Cover Image
              </h2>
            </div>

            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c7a45a] bg-[#fcfaf5] p-5 text-center">
              {preview ? (
                <img
                  src={preview}
                  alt="Cover preview"
                  className="max-h-64 w-full rounded-lg object-cover"
                />
              ) : (
                <>
                  <ImagePlus size={35} className="mb-3 text-[#b38e48]"/>
                  <strong>Upload cover photograph</strong>
                  <span className="mt-2 text-xs text-gray-500">
                    Select an image from your computer
                  </span>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => chooseCover(e.target.files?.[0] || null)}
              />
            </label>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-[#101f3c]">
              Article Content
            </h2>

            <label className="mb-2 block text-sm font-semibold">
              Full Article
            </label>

            <textarea
              className="field"
              rows={12}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write the complete USPF article here..."
            />

            <label className="mb-2 block text-sm font-semibold">
              YouTube Video URL (Optional)
            </label>

            <input
              className="field"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-[#101f3c]">
              Publishing Options
            </h2>

            <select
              className="field"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="draft">Save as Draft</option>
              <option value="published">Publish Now</option>
            </select>

            {message && (
              <p className="mb-4 rounded-lg bg-gray-50 p-4 text-sm">
                {message}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-[#101f3c] px-7 py-3 font-bold text-white disabled:opacity-50"
              >
                {loading
                  ? <><Loader2 className="animate-spin" size={17}/> Saving...</>
                  : <><Globe size={17}/> {status === "published" ? "Publish Article" : "Save Draft"}</>
                }
              </button>
            </div>
          </section>

        </form>

        <section className="mx-auto mt-10 max-w-4xl rounded-xl border bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <Newspaper size={23} className="text-[#b38e48}"/>
            <h2 className="text-xl font-bold text-[#101f3c]">
              Recent Articles ({posts.length})
            </h2>
          </div>

          {posts.map(post => (
            <div key={post.id} className="flex items-center gap-4 border-b py-4">
              {post.cover_image && (
                <img
                  src={post.cover_image}
                  alt=""
                  className="h-16 w-20 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <strong>{post.title}</strong>
                <p className="text-xs text-gray-500">
                  /news/{post.slug} · {post.category}
                </p>
              </div>
              <span className="text-xs font-bold">{post.status}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
