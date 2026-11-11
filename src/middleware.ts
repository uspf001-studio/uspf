import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }}
  );
  const { data: { user } } = await supabase.auth.getUser();
  let authorized = false;
  let allowlistError = false;
  if (user) {
    const { data: admin, error } = await supabase
      .from("website_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("Unable to verify USPF website administrator:", error.message);
      allowlistError = true;
    }
    authorized = !error && Boolean(admin);
  }

  if (!authorized) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set(
      "error",
      allowlistError ? "admin-setup-required" : user ? "not-authorized" : "sign-in-required",
    );
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = { matcher: ["/admin/:path*"] };
