import Image from "next/image";
import Link from "next/link";
import { type CSSProperties } from "react";

type WebsitePage = {
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  introduction: string;
  hero_image_url: string | null;
  hero_image_border_width: number;
};

type PageSection = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  image_border_width: number;
  button_label: string | null;
  button_url: string | null;
};

export default function PublicContentPage({
  page,
  sections,
}: {
  page: WebsitePage;
  sections: PageSection[];
}) {
  return (
    <div className="visual-page-content">
      <section
        className={`visual-page-hero${page.hero_image_url ? " has-image" : ""}`}
        style={{ "--hero-image-border-width": `${page.hero_image_border_width}px` } as CSSProperties}
      >
        {page.hero_image_url && (
          <div className="visual-hero-image-frame">
            <Image src={page.hero_image_url} alt="" fill unoptimized priority sizes="(max-width: 760px) 100vw, 45vw" />
          </div>
        )}
        <div className="visual-container visual-hero-copy">
          <p className="eyebrow">{page.eyebrow || page.label}</p>
          <h1>{page.title}</h1>
          {page.subtitle && <p className="visual-page-subtitle">{page.subtitle}</p>}
          {page.introduction && <p className="visual-page-intro">{page.introduction}</p>}
        </div>
      </section>

      <div className="visual-container visual-sections">
        {sections.length === 0 ? (
          <div className="visual-empty">More information will be added by USPF.</div>
        ) : (
          sections.map((section, index) => (
            <section key={section.id} className={`visual-content-card${section.image_url ? " has-image" : ""}`}>
              {section.image_url && (
                <div
                  className="visual-content-image-frame"
                  style={{
                    "--content-image-border-width": `${section.image_border_width}px`,
                    "--content-image-ring-width": section.image_border_width ? "1px" : "0px",
                  } as CSSProperties}
                >
                  <Image src={section.image_url} alt="" fill unoptimized sizes="(max-width: 760px) 100vw, 40vw" />
                </div>
              )}
              <div className="visual-content-copy">
                <p className="eyebrow">USPF / {String(index + 1).padStart(2, "0")}</p>
                {section.title && <h2>{section.title}</h2>}
                {section.body && <p>{section.body}</p>}
                {section.button_label && section.button_url && (
                  <Link className="gold-btn" href={section.button_url}>{section.button_label} ↗</Link>
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
