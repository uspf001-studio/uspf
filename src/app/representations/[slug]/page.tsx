import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import RepresentationPdfLink from "@/components/RepresentationPdfLink";
import { createClient } from "@/lib/supabase/server";
import { formatRepresentationDate } from "@/lib/representations";

export default async function RepresentationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from("representations")
    .select("id, reference_no, slug, title, category, submission_date, department, summary, recommendations, status, is_published, published_at, created_at, updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .neq("status", "Draft")
    .maybeSingle();

  if (error) throw error;
  if (!record) notFound();

  const [documentsResult, updatesResult] = await Promise.all([
    supabase
      .from("representation_documents")
      .select("id, representation_id, storage_path, file_name, is_public, is_current, created_at")
      .eq("representation_id", record.id)
      .eq("is_public", true)
      .eq("is_current", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("representation_updates")
      .select("id, representation_id, event_type, status, note, is_public, created_at")
      .eq("representation_id", record.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
  ]);
  if (documentsResult.error) throw documentsResult.error;
  if (updatesResult.error) throw updatesResult.error;

  return (
    <>
      <Header />
      <main className="representation-detail-page">
        <div className="representation-container">
          <Link className="representation-back-link" href="/representations">← All representations</Link>
          <article className="representation-detail">
            <p className="eyebrow">{record.category}</p>
            <div className="representation-card-topline">
              <span>{record.reference_no}</span>
              <span className={`representation-status status-${record.status.toLowerCase().replaceAll(" ", "-")}`}>
                {record.status}
              </span>
            </div>
            <h1>{record.title}</h1>
            <dl className="representation-detail-meta">
              <div><dt>Date of submission</dt><dd>{formatRepresentationDate(record.submission_date)}</dd></div>
              <div><dt>Addressed to</dt><dd>{record.department}</dd></div>
              <div><dt>Last updated</dt><dd>{new Date(record.updated_at).toLocaleDateString()}</dd></div>
            </dl>

            <section>
              <h2>Issue summary</h2>
              <p>{record.summary}</p>
            </section>
            <section>
              <h2>USPF recommendations</h2>
              <p className="representation-preserve-lines">{record.recommendations}</p>
            </section>

            {(documentsResult.data || []).length > 0 && (
              <section>
                <h2>Supporting documents</h2>
                <ul className="representation-document-list">
                  {documentsResult.data!.map((document) => (
                    <li key={document.id}>
                      <RepresentationPdfLink storagePath={document.storage_path} fileName={document.file_name} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(updatesResult.data || []).length > 0 && (
              <section>
                <h2>Public follow-up</h2>
                <ol className="representation-updates">
                  {updatesResult.data!.map((update) => (
                    <li key={update.id}>
                      <div className="representation-update-date">
                        {new Date(update.created_at).toLocaleDateString()}
                        {update.event_type === "status" && update.status ? ` · Status: ${update.status}` : ""}
                      </div>
                      {update.note && <p>{update.note}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </article>
          <p className="representation-disclaimer">
            This publication provides general information and is not legal advice or a guarantee of any outcome.
          </p>
        </div>
      </main>
    </>
  );
}
