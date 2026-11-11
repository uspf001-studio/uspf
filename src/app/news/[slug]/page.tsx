import Image from "next/image";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("title, slug, category, summary, body, cover_image, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  if (!post) notFound();

  return (
    <>
      <Header />
      <main className="visual-page">
        <article className="visual-container news-article">
          <p className="eyebrow">{post.category}</p>
          <h1>{post.title}</h1>
          {post.published_at && <p className="news-article-date">{new Date(post.published_at).toLocaleDateString()}</p>}
          {post.cover_image && (
            <div className="news-article-frame">
              <Image src={post.cover_image} alt="" fill unoptimized priority sizes="(max-width: 760px) 100vw, 1000px" />
            </div>
          )}
          {post.summary && <p className="news-article-summary">{post.summary}</p>}
          <div className="news-article-body">{post.body}</div>
        </article>
      </main>
    </>
  );
}
