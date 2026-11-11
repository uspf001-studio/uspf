import { redirect } from "next/navigation";

export default function AboutManagerPage() {
  redirect("/admin/website/pages?page=about");
}
