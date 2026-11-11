import { notFound } from "next/navigation";
import Header from "@/components/Header";
import MembershipApplicationForm from "@/components/MembershipApplicationForm";
import PublicContentPage from "@/components/PublicContentPage";
import { createClient } from "@/lib/supabase/server";

const pageSlugs = new Set([
  "about",
  "membership",
  "president",
  "teachers-protection",
  "school-safety",
  "child-protection",
]);

export default async function WebsiteContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!pageSlugs.has(slug)) notFound();

  const supabase = await createClient();
  const { data: page, error } = await supabase
    .from("website_pages")
    .select("slug, label, eyebrow, title, subtitle, introduction, hero_image_url, hero_image_border_width, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  if (!page) notFound();

  const { data: sections, error: sectionsError } = await supabase
    .from("website_page_sections")
    .select("id, title, body, image_url, image_border_width, button_label, button_url")
    .eq("page_slug", slug)
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  if (sectionsError) throw sectionsError;

  return (
    <>
      <Header />
      <main className="visual-page">
        <PublicContentPage page={page} sections={sections || []} />
        {slug === "membership" && (
          <section className="visual-container membership-form-wrap">
            <MembershipApplicationForm />
          </section>
        )}
      </main>
    </>
  );
}
