"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  homepageContentDefaults,
  normalizeHomepageContent,
  type EditableHomepageValue,
  type HomepageContent,
} from "@/lib/homepage-content";

type PathPart = string | number;

function isContentRecord(
  value: EditableHomepageValue,
): value is { [key: string]: EditableHomepageValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function updateAtPath(
  value: EditableHomepageValue,
  path: PathPart[],
  nextValue: EditableHomepageValue,
): EditableHomepageValue {
  if (path.length === 0) return nextValue;
  const [part, ...rest] = path;
  if (Array.isArray(value) && typeof part === "number") {
    return value.map((item, index) => index === part
      ? updateAtPath(item, rest, nextValue)
      : item);
  }
  if (isContentRecord(value) && typeof part === "string") {
    return { ...value, [part]: updateAtPath(value[part], rest, nextValue) };
  }
  return value;
}

function getAtPath(
  value: EditableHomepageValue,
  path: PathPart[],
): EditableHomepageValue | undefined {
  let current: EditableHomepageValue | undefined = value;
  for (const part of path) {
    if (Array.isArray(current) && typeof part === "number") {
      current = current[part];
    } else if (current && isContentRecord(current) && typeof part === "string") {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function emptyLike(value: EditableHomepageValue): EditableHomepageValue {
  if (typeof value === "string") return "";
  if (Array.isArray(value)) return [];
  if (isContentRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, emptyLike(child)]),
    );
  }
  return "";
}

function fieldLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ContentField({
  value,
  path,
  label,
  onChange,
}: {
  value: EditableHomepageValue;
  path: PathPart[];
  label: string;
  onChange: (path: PathPart[], value: EditableHomepageValue) => void;
}) {
  const id = `homepage-content-${path.map(String).join("-")}`;

  if (typeof value === "string") {
    const key = String(path[path.length - 1] || "");
    const multiline = /body|description|note|paragraph|quote/i.test(key) || value.length > 110;
    return (
      <label className="block text-sm font-medium text-gray-700" htmlFor={id}>
        {label}
        {multiline ? (
          <textarea
            id={id}
            rows={3}
            value={value}
            onChange={(event) => onChange(path, event.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 p-3 font-normal"
          />
        ) : (
          <input
            id={id}
            value={value}
            onChange={(event) => onChange(path, event.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 p-3 font-normal"
          />
        )}
      </label>
    );
  }

  if (Array.isArray(value)) {
    const defaultsAtPath = getAtPath(homepageContentDefaults as EditableHomepageValue, path);
    const template = Array.isArray(defaultsAtPath) ? defaultsAtPath[0] : undefined;
    return (
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">{label}</legend>
        {value.map((item, index) => (
          <div className="rounded-lg bg-gray-50 p-3" key={`${id}-${index}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Item {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(path, value.filter((_, itemIndex) => itemIndex !== index))}
                className="text-xs font-semibold text-red-700"
              >
                Remove
              </button>
            </div>
            <ContentField
              value={item}
              path={[...path, index]}
              label={`${label} item ${index + 1}`}
              onChange={onChange}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange(path, [...value, emptyLike(template ?? "")])}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
        >
          Add {label.replace(/s$/, "")}
        </button>
      </fieldset>
    );
  }

  if (isContentRecord(value)) {
    return (
      <fieldset className="grid gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-gray-800">{label}</legend>
        {Object.entries(value).map(([key, child]) => (
          <div className={isContentRecord(child) || Array.isArray(child) ? "md:col-span-2" : ""} key={key}>
            <ContentField
              value={child}
              path={[...path, key]}
              label={fieldLabel(key)}
              onChange={onChange}
            />
          </div>
        ))}
      </fieldset>
    );
  }

  return null;
}

export default function HomepageContentManager() {
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState<HomepageContent>(homepageContentDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadContent() {
      const { data, error } = await supabase
        .from("homepage_content")
        .select("content")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        if (mounted) {
          setNotice({
            type: "error",
            text: `Homepage content could not be loaded: ${error.message}. Apply the homepage content migration first.`,
          });
        }
      } else if (mounted && data?.content) {
        setDraft(normalizeHomepageContent(data.content));
      }
      if (mounted) setLoading(false);
    }

    void loadContent();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  function changeContent(path: PathPart[], value: EditableHomepageValue) {
    setDraft((current) =>
      updateAtPath(current as EditableHomepageValue, path, value) as HomepageContent,
    );
  }

  async function saveContent() {
    setSaving(true);
    setNotice(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw userError || new Error("Administrator session is unavailable.");
      }

      const { error } = await supabase
        .from("homepage_content")
        .upsert({
          id: 1,
          content: draft,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;

      setNotice({ type: "success", text: "Homepage content saved and published." });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Homepage content could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[#9a7835]">Page Content</p>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">Homepage content editor</h2>
        <p className="mt-1 text-sm text-gray-500">
          Edit the headings, copy, links and cards used throughout the supplied homepage design.
          Hero slides and their images are managed below.
        </p>
      </div>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={`rounded-lg border p-3 text-sm ${
            notice.type === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {notice.text}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading homepage content...</p>
      ) : (
        <div className="space-y-5">
          <ContentField
            value={draft as EditableHomepageValue}
            path={[]}
            label="Homepage"
            onChange={changeContent}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveContent()}
            className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save homepage content"}
          </button>
        </div>
      )}
    </section>
  );
}
