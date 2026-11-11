"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatRepresentationDate,
  makeRepresentationSlug,
  representationCategories,
  representationStatuses,
  type Representation,
  type RepresentationCategory,
  type RepresentationDocument,
  type RepresentationStatus,
  type RepresentationUpdate,
} from "@/lib/representations";

type RepresentationDraft = {
  reference_no: string;
  slug: string;
  title: string;
  category: RepresentationCategory;
  submission_date: string;
  department: string;
  summary: string;
  recommendations: string;
  status: RepresentationStatus;
};

const emptyDraft: RepresentationDraft = {
  reference_no: "",
  slug: "",
  title: "",
  category: representationCategories[0],
  submission_date: "",
  department: "",
  summary: "",
  recommendations: "",
  status: "Draft",
};

function dateForInput(value: string) {
  return value.slice(0, 10);
}

export default function RepresentationManager() {
  const supabase = useMemo(() => createClient(), []);
  const [records, setRecords] = useState<Representation[]>([]);
  const [documents, setDocuments] = useState<RepresentationDocument[]>([]);
  const [updates, setUpdates] = useState<RepresentationUpdate[]>([]);
  const [selected, setSelected] = useState<Representation | null>(null);
  const [draft, setDraft] = useState<RepresentationDraft>(emptyDraft);
  const [pdf, setPdf] = useState<File | null>(null);
  const [pdfIsPublic, setPdfIsPublic] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [followUpIsPublic, setFollowUpIsPublic] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("representations")
      .select("id, reference_no, slug, title, category, submission_date, department, summary, recommendations, status, is_published, published_at, created_at, updated_at")
      .order("updated_at", { ascending: false });
    setLoading(false);

    if (error) {
      setNotice({ type: "error", text: `Could not load representations: ${error.message}` });
      return;
    }

    setRecords((data || []) as Representation[]);
  }, [supabase]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  async function loadRecordDetails(record: Representation) {
    setSelected(record);
    setDraft({
      reference_no: record.reference_no,
      slug: record.slug,
      title: record.title,
      category: record.category,
      submission_date: dateForInput(record.submission_date),
      department: record.department,
      summary: record.summary,
      recommendations: record.recommendations,
      status: record.status,
    });
    setPdf(null);
    setPdfIsPublic(false);
    setFollowUp("");
    setFollowUpIsPublic(false);
    setNotice(null);

    const [documentsResult, updatesResult] = await Promise.all([
      supabase
        .from("representation_documents")
        .select("id, representation_id, storage_path, file_name, is_public, is_current, created_at")
        .eq("representation_id", record.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("representation_updates")
        .select("id, representation_id, event_type, status, note, is_public, created_at")
        .eq("representation_id", record.id)
        .order("created_at", { ascending: false }),
    ]);

    if (documentsResult.error || updatesResult.error) {
      setNotice({
        type: "error",
        text: `Record details could not be loaded: ${documentsResult.error?.message || updatesResult.error?.message}`,
      });
      return;
    }
    setDocuments((documentsResult.data || []) as RepresentationDocument[]);
    setUpdates((updatesResult.data || []) as RepresentationUpdate[]);
  }

  function startNew() {
    setSelected(null);
    setDraft(emptyDraft);
    setDocuments([]);
    setUpdates([]);
    setPdf(null);
    setPdfIsPublic(false);
    setFollowUp("");
    setFollowUpIsPublic(false);
    setNotice(null);
  }

  function updateDraft<K extends keyof RepresentationDraft>(key: K, value: RepresentationDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function addUpdate(
    representationId: string,
    eventType: RepresentationUpdate["event_type"],
    status: RepresentationStatus | null,
    note: string | null,
    isPublic: boolean,
    userId: string,
  ) {
    const { error } = await supabase.from("representation_updates").insert({
      representation_id: representationId,
      event_type: eventType,
      status,
      note,
      is_public: isPublic,
      changed_by: userId,
    });
    if (error) throw error;
  }

  async function uploadPdf(representationId: string) {
    if (!pdf) return;
    if (pdf.type !== "application/pdf" || !pdf.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Choose a PDF document.");
    }
    if (pdf.size > 20 * 1024 * 1024) {
      throw new Error("The PDF must be 20 MB or smaller.");
    }

    const storagePath = `${representationId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase
      .storage
      .from("representation-documents")
      .upload(storagePath, pdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw uploadError;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      const { error: cleanupError } = await supabase.storage.from("representation-documents").remove([storagePath]);
      if (cleanupError) console.error("Temporary representation PDF cleanup failed:", cleanupError.message);
      throw userError || new Error("Administrator session is no longer available.");
    }

    const { error: documentError } = await supabase.from("representation_documents").insert({
      representation_id: representationId,
      storage_path: storagePath,
      file_name: pdf.name,
      is_public: pdfIsPublic,
      is_current: true,
      uploaded_by: userData.user.id,
    });
    if (documentError) {
      const { error: cleanupError } = await supabase.storage.from("representation-documents").remove([storagePath]);
      if (cleanupError) console.error("Temporary representation PDF cleanup failed:", cleanupError.message);
      throw documentError;
    }

    const { error: previousDocumentError } = await supabase
      .from("representation_documents")
      .update({ is_current: false })
      .eq("representation_id", representationId)
      .neq("storage_path", storagePath);
    if (previousDocumentError) throw previousDocumentError;
  }

  async function saveRepresentation(publish: boolean) {
    const title = draft.title.trim();
    const referenceNo = draft.reference_no.trim();
    const slug = makeRepresentationSlug(draft.slug || title);
    const department = draft.department.trim();
    const summary = draft.summary.trim();
    const recommendations = draft.recommendations.trim();

    if (!referenceNo || !title || !slug || !draft.submission_date || !department || !summary || !recommendations) {
      setNotice({ type: "error", text: "Complete every required field before saving." });
      return;
    }
    if (publish && draft.status === "Draft") {
      setNotice({ type: "error", text: "Select a verified non-draft status before publishing." });
      return;
    }
    const statusChanged = selected
      ? selected.status !== draft.status
      : draft.status !== "Draft";
    if (statusChanged && !followUp.trim()) {
      setNotice({ type: "error", text: "Add the verified source or supporting record for this status before saving." });
      return;
    }
    if (pdf && (pdf.type !== "application/pdf" || !pdf.name.toLowerCase().endsWith(".pdf"))) {
      setNotice({ type: "error", text: "Choose a PDF document." });
      return;
    }

    setSaving(true);
    setNotice(null);
    let savedId = selected?.id;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError || new Error("Administrator session is no longer available.");

      const values = {
        reference_no: referenceNo,
        slug,
        title,
        category: draft.category,
        submission_date: draft.submission_date,
        department,
        summary,
        recommendations,
        status: draft.status,
        is_published: publish,
        published_at: publish ? selected?.published_at || new Date().toISOString() : null,
        published_by: publish ? userData.user.id : null,
        updated_at: new Date().toISOString(),
      };

      if (selected) {
        const { error } = await supabase.from("representations").update(values).eq("id", selected.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("representations")
          .insert(values)
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      if (!savedId) throw new Error("The representation was saved without an identifier.");
      const wasPublished = selected?.is_published || false;
      const shouldRecordStatus = !selected || statusChanged;
      if (shouldRecordStatus) {
        await addUpdate(savedId, "status", draft.status, followUp.trim() || null, followUpIsPublic, userData.user.id);
      }
      if (wasPublished !== publish) {
        await addUpdate(
          savedId,
          publish ? "published" : "unpublished",
          null,
          publish ? "Record published by an approved administrator." : "Record unpublished by an approved administrator.",
          false,
          userData.user.id,
        );
      }
      if (followUp.trim() && !shouldRecordStatus) {
        await addUpdate(savedId, "follow_up", null, followUp.trim(), followUpIsPublic, userData.user.id);
      }
      await uploadPdf(savedId);

      setNotice({ type: "success", text: publish ? "Representation saved and published." : "Representation saved as a draft." });
      setFollowUp("");
      setPdf(null);
      await loadRecords();
      const { data: savedRecord, error: savedRecordError } = await supabase
        .from("representations")
        .select("id, reference_no, slug, title, category, submission_date, department, summary, recommendations, status, is_published, published_at, created_at, updated_at")
        .eq("id", savedId)
        .single();
      if (savedRecordError) throw savedRecordError;
      await loadRecordDetails(savedRecord as Representation);
      setNotice({ type: "success", text: publish ? "Representation saved and published." : "Representation saved as a draft." });
    } catch (error) {
      if (savedId) {
        await loadRecords();
        const { data: savedRecord, error: savedRecordError } = await supabase
          .from("representations")
          .select("id, reference_no, slug, title, category, submission_date, department, summary, recommendations, status, is_published, published_at, created_at, updated_at")
          .eq("id", savedId)
          .maybeSingle();
        if (!savedRecordError && savedRecord) await loadRecordDetails(savedRecord as Representation);
      }
      setNotice({
        type: "error",
        text: error instanceof Error ? `Save failed: ${error.message}` : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function changeDocumentVisibility(document: RepresentationDocument, isPublic: boolean) {
    const { error } = await supabase
      .from("representation_documents")
      .update({ is_public: isPublic })
      .eq("id", document.id);
    if (error) {
      setNotice({ type: "error", text: `Document privacy could not be updated: ${error.message}` });
      return;
    }
    setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, is_public: isPublic } : item));
    setNotice({ type: "success", text: isPublic ? "Document approved for public access." : "Document is now private." });
  }

  async function deleteRepresentation(record: Representation) {
    if (!window.confirm(`Permanently delete "${record.title}" and its document history?`)) return;
    setNotice(null);
    const { data: files, error: filesError } = await supabase
      .from("representation_documents")
      .select("storage_path")
      .eq("representation_id", record.id);
    if (filesError) {
      setNotice({ type: "error", text: `Could not inspect stored PDFs: ${filesError.message}` });
      return;
    }
    if (files?.length) {
      const { error } = await supabase.storage.from("representation-documents").remove(files.map((file) => file.storage_path));
      if (error) {
        setNotice({ type: "error", text: `Stored PDFs could not be deleted: ${error.message}` });
        return;
      }
    }
    const { error } = await supabase.from("representations").delete().eq("id", record.id);
    if (error) {
      setNotice({ type: "error", text: `Representation could not be deleted: ${error.message}` });
      return;
    }
    if (selected?.id === record.id) startNew();
    setNotice({ type: "success", text: "Representation and its records were deleted." });
    await loadRecords();
  }

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) =>
      (categoryFilter === "All categories" || record.category === categoryFilter)
      && (statusFilter === "All statuses" || record.status === statusFilter)
      && (!query || [record.reference_no, record.title, record.department].some((value) => value.toLowerCase().includes(query))),
    );
  }, [categoryFilter, records, search, statusFilter]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#9a7835]">Policy Advocacy</p>
            <h1 className="mt-2 text-3xl font-bold text-[#101f3c]">Government Representations</h1>
            <p className="mt-2 text-sm text-gray-600">Manage approved records, verified status and public documents.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="rounded-lg border bg-white px-4 py-3 text-sm font-medium">Dashboard</Link>
            <Link href="/representations" target="_blank" className="rounded-lg border bg-white px-4 py-3 text-sm font-medium">View public page</Link>
            <button type="button" onClick={startNew} className="rounded-lg bg-[#101f3c] px-4 py-3 text-sm font-semibold text-white">New representation</button>
          </div>
        </div>

        {notice && (
          <p role={notice.type === "error" ? "alert" : "status"} className={`mb-5 rounded-lg border p-3 text-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-green-200 bg-green-50 text-green-900"}`}>
            {notice.text}
          </p>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
          <section className="rounded-xl border bg-white p-5 shadow-sm" aria-labelledby="representation-list-title">
            <h2 id="representation-list-title" className="mb-4 text-xl font-bold text-[#101f3c]">Records</h2>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <input aria-label="Search representations" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, reference, authority" className="rounded-lg border p-3 text-sm md:col-span-1" />
              <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border p-3 text-sm">
                <option>All categories</option>
                {representationCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border p-3 text-sm">
                <option>All statuses</option>
                {representationStatuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            {loading ? <p className="py-8 text-center text-sm text-gray-500">Loading records...</p>
              : filteredRecords.length === 0 ? <p className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-600">No records match this search.</p>
                : <div className="space-y-3">
                  {filteredRecords.map((record) => (
                    <article key={record.id} className={`rounded-lg border p-4 ${selected?.id === record.id ? "border-[#c7a45a] bg-[#fcfaf5]" : ""}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button type="button" onClick={() => void loadRecordDetails(record)} className="min-w-0 flex-1 text-left">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#9a7835]">{record.reference_no} · {record.category}</span>
                          <span className="mt-1 block font-semibold text-[#101f3c]">{record.title}</span>
                          <span className="mt-1 block text-xs text-gray-500">{record.status} · {record.is_published ? "Published" : "Draft / unpublished"}</span>
                        </button>
                        <button type="button" onClick={() => void deleteRepresentation(record)} className="rounded border border-red-200 px-3 py-2 text-xs font-medium text-red-700">Delete</button>
                      </div>
                    </article>
                  ))}
                </div>}
          </section>

          <div className="space-y-6">
            <form onSubmit={(event) => { event.preventDefault(); void saveRepresentation(selected?.is_published || false); }} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#9a7835]">{selected ? "Edit record" : "New record"}</p>
                <h2 className="mt-1 text-xl font-bold text-[#101f3c]">Representation details</h2>
                <p className="mt-1 text-xs text-gray-500">Drafts are private. Publishing requires a verified non-draft status.</p>
              </div>

              <label className="block text-sm font-medium">Reference number
                <input required value={draft.reference_no} onChange={(event) => updateDraft("reference_no", event.target.value)} className="mt-1 w-full rounded-lg border p-3" placeholder="Enter the actual reference" />
              </label>
              <label className="block text-sm font-medium">Title
                <input required value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
              </label>
              <label className="block text-sm font-medium">Public page slug
                <input required value={draft.slug} onChange={(event) => updateDraft("slug", event.target.value)} onBlur={() => updateDraft("slug", makeRepresentationSlug(draft.slug || draft.title))} className="mt-1 w-full rounded-lg border p-3" placeholder="auto-generated-from-title" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">Category
                  <select value={draft.category} onChange={(event) => updateDraft("category", event.target.value as RepresentationCategory)} className="mt-1 w-full rounded-lg border p-3">
                    {representationCategories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium">Verified status
                  <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value as RepresentationStatus)} className="mt-1 w-full rounded-lg border p-3">
                    {representationStatuses.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">Date of submission
                  <input required type="date" value={draft.submission_date} onChange={(event) => updateDraft("submission_date", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="block text-sm font-medium">Department / authority
                  <input required value={draft.department} onChange={(event) => updateDraft("department", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                </label>
              </div>
              <label className="block text-sm font-medium">Issue summary
                <textarea required rows={4} value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
              </label>
              <label className="block text-sm font-medium">USPF recommendations
                <textarea required rows={4} value={draft.recommendations} onChange={(event) => updateDraft("recommendations", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
              </label>

              <section className="space-y-3 rounded-lg border p-4" aria-labelledby="representation-pdf-title">
                <h3 id="representation-pdf-title" className="font-semibold text-[#101f3c]">Supporting PDF</h3>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => setPdf(event.target.files?.[0] || null)} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2" />
                {pdf && <p className="break-all text-xs text-gray-600">Selected: {pdf.name} · {(pdf.size / (1024 * 1024)).toFixed(1)} MB</p>}
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={pdfIsPublic} onChange={(event) => setPdfIsPublic(event.target.checked)} className="mt-1" />
                  Approve this PDF for public access. Leave unchecked for confidential/private documents.
                </label>
                <p className="text-xs text-gray-500">Private bucket; PDF-only; maximum 20 MB. Uploading a replacement makes it the current document.</p>
                {documents.map((document) => (
                  <div key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded border bg-gray-50 p-3 text-sm">
                    <span className="min-w-0 break-all">{document.file_name}{document.is_current ? " · Current" : " · Replaced"}</span>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={document.is_public} onChange={(event) => void changeDocumentVisibility(document, event.target.checked)} />
                      Public
                    </label>
                  </div>
                ))}
              </section>

              <section className="space-y-3 rounded-lg border p-4" aria-labelledby="follow-up-title">
                <h3 id="follow-up-title" className="font-semibold text-[#101f3c]">Status evidence / follow-up note</h3>
                <textarea rows={3} value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="w-full rounded-lg border p-3 text-sm" placeholder="Record the source or supporting facts for a status change, or add a follow-up." />
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={followUpIsPublic} onChange={(event) => setFollowUpIsPublic(event.target.checked)} className="mt-1" />
                  Approve this note for public display
                </label>
                <p className="text-xs text-gray-500">A supporting note is required for every status change. Do not include personal or confidential information.</p>
              </section>

              <div className="flex flex-wrap gap-2 border-t pt-4">
                <button type="submit" disabled={saving} className="rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? "Saving..." : selected?.is_published ? "Save changes" : "Save draft"}
                </button>
                <button type="button" disabled={saving} onClick={() => void saveRepresentation(true)} className="rounded-lg bg-[#101f3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? "Saving..." : selected?.is_published ? "Save & publish" : "Publish"}
                </button>
                {selected?.is_published && (
                  <button type="button" disabled={saving} onClick={() => void saveRepresentation(false)} className="rounded-lg border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900 disabled:opacity-50">
                    Unpublish
                  </button>
                )}
              </div>
            </form>

            <section className="rounded-xl border bg-white p-5 shadow-sm" aria-labelledby="record-preview-title">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9a7835]">Private admin preview</p>
              <h2 id="record-preview-title" className="mt-1 text-lg font-bold text-[#101f3c]">{draft.title || "Representation title preview"}</h2>
              <p className="mt-1 text-xs text-gray-500">{draft.reference_no || "Reference number"} · {draft.category} · {draft.status}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{draft.summary || "Issue summary preview will appear here."}</p>
              <p className="mt-3 text-xs text-amber-800">{selected?.is_published ? "Currently public; changes become visible when saved." : "Not published. Public visitors cannot view this draft."}</p>
            </section>

            {selected && (
              <section className="rounded-xl border bg-white p-5 shadow-sm" aria-labelledby="history-title">
                <h2 id="history-title" className="text-lg font-bold text-[#101f3c]">Publication &amp; status history</h2>
                {updates.length === 0 ? <p className="mt-3 text-sm text-gray-500">No history recorded yet.</p> : (
                  <ol className="mt-3 space-y-3">
                    {updates.map((update) => (
                      <li key={update.id} className="border-l-2 border-[#c7a45a] pl-3">
                        <p className="text-sm font-semibold">{update.event_type === "status" ? `Status: ${update.status}` : update.event_type}</p>
                        <p className="text-xs text-gray-500">{new Date(update.created_at).toLocaleString()} · {update.is_public ? "Public note" : "Private record"}</p>
                        {update.note && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{update.note}</p>}
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-3 text-xs text-gray-500">
                  Submitted {formatRepresentationDate(selected.submission_date)} · Updated {new Date(selected.updated_at).toLocaleString()}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
