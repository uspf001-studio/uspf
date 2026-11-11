import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getWebsiteAdminClient } from "@/lib/supabase/admin";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getWebsiteAdminClient();
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string") {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    const { data: media, error: findError } = await supabase
      .from("media")
      .select("*")
      .eq("id", body.id)
      .single();

    if (findError || !media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    if (media.public_id) {
      const result = await cloudinary.uploader.destroy(media.public_id, {
        resource_type: media.media_type === "video" ? "video" : "image",
      });

      if (result.result !== "ok" && result.result !== "not found") {
        return NextResponse.json({ error: "Cloudinary deletion failed" }, { status: 500 });
      }
    }

    const { error: deleteError } = await supabase.from("media").delete().eq("id", body.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to delete media:", error);
    return NextResponse.json({ error: "Unable to delete media" }, { status: 500 });
  }
}
