export const representationCategories = [
  "School Recognition",
  "School Safety",
  "Teacher Protection",
  "RTI-Related Concerns",
  "Single-Window Permissions",
  "GHMC NOC Issues",
  "Education Policy",
] as const;

export const representationStatuses = [
  "Draft",
  "Submitted",
  "Under Consideration",
  "Response Received",
  "Resolved",
  "Closed",
] as const;

export type RepresentationStatus = (typeof representationStatuses)[number];
export type RepresentationCategory = (typeof representationCategories)[number];

export type Representation = {
  id: string;
  reference_no: string;
  slug: string;
  title: string;
  category: RepresentationCategory;
  submission_date: string;
  department: string;
  summary: string;
  recommendations: string;
  status: RepresentationStatus;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RepresentationDocument = {
  id: string;
  representation_id: string;
  storage_path: string;
  file_name: string;
  is_public: boolean;
  is_current: boolean;
  created_at: string;
};

export type RepresentationUpdate = {
  id: string;
  representation_id: string;
  event_type: "status" | "published" | "unpublished" | "follow_up";
  status: RepresentationStatus | null;
  note: string | null;
  is_public: boolean;
  created_at: string;
};

export function makeRepresentationSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatRepresentationDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
