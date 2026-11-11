"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatRepresentationDate,
  representationCategories,
  type Representation,
} from "@/lib/representations";

type Props = {
  records: Representation[];
  loadError?: string;
};

export default function RepresentationsListing({ records, loadError }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All statuses");

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesCategory = category === "All categories" || record.category === category;
      const matchesStatus = status === "All statuses" || record.status === status;
      const matchesSearch = !normalizedSearch || [
        record.reference_no,
        record.title,
        record.department,
        record.summary,
        record.recommendations,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [category, records, search, status]);

  return (
    <>
      <div className="representation-category-grid" aria-label="Representation categories">
        {representationCategories.map((item, index) => {
          const count = records.filter((record) => record.category === item).length;
          return (
            <button
              type="button"
              key={item}
              className={`representation-category-card${category === item ? " is-selected" : ""}`}
              onClick={() => setCategory(category === item ? "All categories" : item)}
              aria-pressed={category === item}
            >
              <span className="representation-category-number">{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
              <span>{count} {count === 1 ? "published record" : "published records"}</span>
            </button>
          );
        })}
      </div>

      <section className="representation-directory" aria-labelledby="representation-directory-title">
        <div className="representation-directory-heading">
          <div>
            <p className="eyebrow">PUBLIC RECORDS</p>
            <h2 id="representation-directory-title">Government representation tracker</h2>
          </div>
          <p>Only published records and approved public documents are shown.</p>
        </div>

        <div className="representation-filters">
          <label>
            <span>Search representations</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, title, authority or keyword"
            />
          </label>
          <label>
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>All categories</option>
              {representationCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All statuses</option>
              {["Submitted", "Under Consideration", "Response Received", "Resolved", "Closed"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {loadError ? (
          <p role="alert" className="representation-empty">Representations could not be loaded. Please try again later.</p>
        ) : filteredRecords.length === 0 ? (
          <div className="representation-empty">
            {records.length === 0
              ? "No government representations have been published."
              : "No published representations match these filters."}
          </div>
        ) : (
          <div className="representation-list">
            {filteredRecords.map((record) => (
              <article className="representation-card" key={record.id}>
                <div className="representation-card-topline">
                  <span>{record.reference_no}</span>
                  <span className={`representation-status status-${record.status.toLowerCase().replaceAll(" ", "-")}`}>
                    {record.status}
                  </span>
                </div>
                <p className="representation-category-label">{record.category}</p>
                <h3><Link href={`/representations/${record.slug}`}>{record.title}</Link></h3>
                <p className="representation-summary">{record.summary}</p>
                <dl>
                  <div><dt>Submitted</dt><dd>{formatRepresentationDate(record.submission_date)}</dd></div>
                  <div><dt>Addressed to</dt><dd>{record.department}</dd></div>
                </dl>
                <Link className="representation-read-more" href={`/representations/${record.slug}`}>
                  View representation <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
