import { createClient } from "@/lib/supabase/server";

export async function getWebsiteAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return { supabase, user: null };
  }

  const { data: admin, error: adminError } = await supabase
    .from("website_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    throw adminError;
  }

  return { supabase, user: admin ? user : null };
}
