import { redirect } from "next/navigation";

export default function PresidentManagerPage() {
  redirect("/admin/website/pages?page=president");
}
