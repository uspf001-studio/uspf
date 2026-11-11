"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MembershipApplicationForm() {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const { error } = await createClient().from("membership_applications").insert({
      full_name: String(formData.get("full_name") || "").trim(),
      institution: String(formData.get("institution") || "").trim() || null,
      role: String(formData.get("role") || "").trim() || null,
      district: String(formData.get("district") || "").trim() || null,
      mobile: String(formData.get("mobile") || "").trim(),
      email: String(formData.get("email") || "").trim() || null,
      message: String(formData.get("message") || "").trim() || null,
    });

    setSaving(false);
    if (error) {
      setNotice({ type: "error", text: `Application could not be submitted: ${error.message}` });
      return;
    }

    event.currentTarget.reset();
    setNotice({ type: "success", text: "Thank you. Your membership enquiry has been submitted." });
  }

  return (
    <form className="membership-form" onSubmit={submit}>
      <h2>Membership enquiry</h2>
      <p>Share your contact details and USPF can follow up about membership.</p>
      <div className="membership-form-grid">
        <label>Full name<input name="full_name" required maxLength={160} /></label>
        <label>Mobile number<input name="mobile" required maxLength={40} /></label>
        <label>Email address<input name="email" type="email" maxLength={254} /></label>
        <label>Institution<input name="institution" maxLength={200} /></label>
        <label>Role<input name="role" maxLength={120} /></label>
        <label>District<input name="district" maxLength={120} /></label>
      </div>
      <label>Message<textarea name="message" rows={4} maxLength={2000} /></label>
      {notice && <p role={notice.type === "error" ? "alert" : "status"} className={`membership-notice ${notice.type}`}>{notice.text}</p>}
      <button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit membership enquiry"}</button>
      <p className="membership-privacy-note">Please share only information relevant to this enquiry.</p>
    </form>
  );
}
