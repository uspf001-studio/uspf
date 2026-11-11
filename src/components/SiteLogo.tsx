"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SiteLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadLogo() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("logo_url")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Website logo could not be loaded:", error.message);
      } else if (mounted) {
        setLogoUrl(data?.logo_url || null);
      }
    }

    void loadLogo();
    return () => {
      mounted = false;
    };
  }, []);

  if (!logoUrl) return <div className="logo-mark">U</div>;

  return (
    <span className="site-logo-image">
      <Image src={logoUrl} alt="USPF logo" width={180} height={56} unoptimized />
    </span>
  );
}
