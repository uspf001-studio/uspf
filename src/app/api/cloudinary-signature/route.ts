import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getWebsiteAdminClient } from "@/lib/supabase/admin";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST() {
  let user;
  try {
    ({ user } = await getWebsiteAdminClient());
  } catch (error) {
    console.error("Unable to verify website administrator for upload signature:", error);
    return NextResponse.json({ error: "Unable to verify administrator access" }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
  }
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: "uspf" },
    process.env.CLOUDINARY_API_SECRET!
  );
  return NextResponse.json({
    timestamp, signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: "uspf"
  });
}
