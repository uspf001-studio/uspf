import Header from "@/components/Header";
import RepresentationsListing from "@/components/RepresentationsListing";
import { createClient } from "@/lib/supabase/server";
import type { Representation } from "@/lib/representations";

export const metadata = {
  title: "Policy Advocacy & Government Representations | USPF",
  description: "Published USPF policy advocacy and government representation records.",
};

export default async function RepresentationsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("representations")
    .select("id, reference_no, slug, title, category, submission_date, department, summary, recommendations, status, is_published, published_at, created_at, updated_at")
    .eq("is_published", true)
    .neq("status", "Draft")
    .order("submission_date", { ascending: false });

  return (
    <>
      <Header />
      <main className="representation-page">
        <section className="representation-hero">
          <div className="representation-container">
            <p className="eyebrow">USPF / POLICY ADVOCACY</p>
            <h1>Policy Advocacy &amp; Government Representations</h1>
            <p className="representation-hero-subtitle">Constructive Dialogue. Fair Governance. Stronger Institutions.</p>
            <p className="representation-hero-copy">
              USPF brings educational stakeholders together to document shared concerns and engage government authorities on
              challenges affecting schools, teachers and school managements. Published records reflect information approved
              for public release; unpublished and confidential material is not displayed.
            </p>
          </div>
        </section>

        <section className="representation-container representation-section">
          <div className="representation-intro">
            <p className="eyebrow">AREAS OF ENGAGEMENT</p>
            <h2>Focused on fair, practical outcomes for education.</h2>
            <p>Explore the focus areas and published submissions. An empty tracker means no records have been approved for publication yet.</p>
          </div>
          <RepresentationsListing records={(data || []) as Representation[]} loadError={error?.message} />
        </section>

        <section className="representation-protection">
          <div className="representation-container">
            <p className="eyebrow">PROTECTION &amp; ADVOCACY CENTRE</p>
            <h2>Practical awareness. Collective advocacy.</h2>
            <p className="representation-protection-lead">
              The centre supports informed dialogue and awareness across the school community. It is not a law firm and does not provide legal advice or legal representation.
            </p>
            <div className="representation-protection-grid">
              {[
                ["Teacher protection", "Promoting dignity, fair processes and awareness of professional protections."],
                ["School institutional protection", "Supporting safe, fair and transparent practices for educational institutions."],
                ["Child protection", "Encouraging safeguarding, well-being and safe learning environments."],
                ["Legal awareness", "Sharing general awareness information; individuals should consult a qualified legal professional for advice on their circumstances."],
                ["Policy advocacy", "Collecting stakeholder concerns and developing constructive recommendations."],
                ["Government engagement", "Documenting submissions and verified developments with relevant authorities."],
                ["Awareness & support initiatives", "Encouraging collaboration, information sharing and responsible community initiatives."],
              ].map(([title, description]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <p className="representation-disclaimer">
              Information on this page is general and educational. It is not legal advice, and reading it does not create a professional relationship with USPF.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
