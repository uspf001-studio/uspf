"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  storagePath: string;
  fileName: string;
};

export default function RepresentationPdfLink({ storagePath, fileName }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createDownloadLink() {
    setLoading(true);
    setError("");
    const { data, error: storageError } = await createClient()
      .storage
      .from("representation-documents")
      .createSignedUrl(storagePath, 300, { download: fileName });
    setLoading(false);

    if (storageError) {
      setError(`PDF unavailable: ${storageError.message}`);
      return;
    }

    setUrl(data.signedUrl);
  }

  if (url) {
    return (
      <a className="representation-pdf-link" href={url} target="_blank" rel="noreferrer">
        Download {fileName}
      </a>
    );
  }

  return (
    <div>
      <button type="button" className="representation-pdf-link" onClick={() => void createDownloadLink()} disabled={loading}>
        {loading ? "Preparing PDF..." : `View ${fileName}`}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
