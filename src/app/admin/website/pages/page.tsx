import PageStudio from "@/app/admin/website/pages/PageStudio";

export default async function WebsitePageStudio({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  return <PageStudio initialPage={page || "about"} />;
}
