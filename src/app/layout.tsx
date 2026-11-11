
import type { Metadata } from "next";
import "./globals.css";
import WebsiteLiveSettings from "@/components/WebsiteLiveSettings";

export const metadata: Metadata = {
  title: "USPF | United Schools Protection Forum",
  description:
    "Protecting educators. Strengthening institutions. Safeguarding children.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WebsiteLiveSettings />
        {children}
      </body>
    </html>
  );
}
