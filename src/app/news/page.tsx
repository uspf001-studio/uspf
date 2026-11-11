import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import PublicContentPage from "@/components/PublicContentPage";
import { createClient } from "@/lib/supabase/server";

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  cover_image: string | null;
  published_at: string | null;
};

export const metadata = {
  title: "News & Media | USPF",
  description: "Updates and information published by the United Schools Protection Forum.",
};

export default async function NewsPage() {
  const supabase = await createClient();
  const [postsResult, pageResult, sectionsResult] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, slug, category, summary, cover_image, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase
      .from("website_pages")
      .select("eyebrow, title, subtitle, introduction, hero_image_url, hero_image_border_width")
      .eq("slug", "news")
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("website_page_sections")
      .select("id, title, body, image_url, image_border_width, button_label, button_url")
      .eq("page_slug", "news")
      .eq("is_visible", true)
      .order("display_order", { ascending: true }),
  ]);
  const { data, error } = postsResult;
  const page = pageResult.data;

  if (pageResult.error) throw pageResult.error;
  if (!page) notFound();

  return (
    <>
      <Header />
      <main className="visual-page">
        {sectionsResult.error ? (
          <p role="alert" className="visual-empty">News page content could not be loaded.</p>
        ) : (
          <PublicContentPage
            page={{
              label: "News & Media",
              eyebrow: page.eyebrow || "USPF / NEWSROOM",
              title: page.title || "News & Media",
              subtitle: page.subtitle || "Updates and information from USPF.",
              introduction: page.introduction || "Browse updates published by USPF. Only articles approved for publication are displayed.",
              hero_image_url: page.hero_image_url || null,
              hero_image_border_width: page.hero_image_border_width,
            }}
            sections={sectionsResult.data || []}
          />
        )}
        <section className="visual-container news-page-content">
          {error ? (
            <p role="alert" className="visual-empty">News could not be loaded. Please try again later.</p>
          ) : !data?.length ? (
            <p className="visual-empty">No news articles have been published yet.</p>
          ) : (
            <div className="news-grid">
              {(data as Post[]).map((post) => (
                <article className="news-card framed-news-card" key={post.id}>
                  {post.cover_image && <div className="framed-news-image" style={{ backgroundImage: `url("${post.cover_image.replaceAll('"', "%22")}")` }} aria-hidden="true" />}
                  <div className="news-copy">
                    <small>{post.category} · {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}</small>
                    <h2>{post.title}</h2>
                    <p>{post.summary || "Read this update from USPF."}</p>
                    <Link className="text-link" href={`/news/${post.slug}`}>READ ARTICLE ↗</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
