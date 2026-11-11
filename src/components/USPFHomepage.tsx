"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SiteLogo from "@/components/SiteLogo";
import { createClient } from "@/lib/supabase/client";
import {
  homepageContentDefaults,
  normalizeHomepageContent,
  type HomepageContent,
} from "@/lib/homepage-content";

function safeHref(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#")) return value;
  if (/^https?:\/\/\S+$/i.test(value)) return value;
  return "#";
}

function safeImageUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return /^https?:\/\/\S+$/i.test(value) ? value : "";
}

function ContentLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const destination = safeHref(href);
  const external = /^https?:\/\//i.test(destination);
  return (
    <a
      className={className}
      href={destination}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

export default function USPFHomepage() {
  const supabase = useMemo(() => createClient(), []);
  const [content, setContent] = useState<HomepageContent>(homepageContentDefaults);

  useEffect(() => {
    let mounted = true;
    async function loadContent() {
      const { data, error } = await supabase
        .from("homepage_content")
        .select("content")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Homepage content could not be loaded:", error.message);
        return;
      }
      if (mounted && data?.content) {
        setContent(normalizeHomepageContent(data.content));
      }
    }

    void loadContent();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const aboutImage = safeImageUrl(content.about.imageUrl);
  const presidentImage = safeImageUrl(content.president.imageUrl);

  return (
    <div className="uspf-home">
      <Header
        toplineLocation={content.topline.location}
        toplineVision={content.topline.vision}
      />
      <Hero
        discoverButtonLabel={content.hero.discoverButtonLabel}
        discoverButtonUrl={content.hero.discoverButtonUrl}
      />

      <main>
        <section className="uspf-section uspf-pillars" id="pillars">
          <div className="uspf-container">
            <div className="uspf-section-intro">
              <div className="uspf-kicker">{content.pillars.kicker}</div>
              <h2>{content.pillars.title}</h2>
              <p>{content.pillars.description}</p>
            </div>
            <div className="uspf-pillar-grid">
              {content.pillars.items.map((item, index) => (
                <article className="uspf-pillar-card" key={`${item.number}-${index}`}>
                  <div className="uspf-pillar-number">{item.number}</div>
                  <div className="uspf-pillar-symbol" aria-hidden="true">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <ContentLink className="uspf-text-link" href={item.linkUrl}>
                    {item.linkLabel}
                  </ContentLink>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="uspf-section uspf-about" id="about">
          <div className="uspf-container uspf-split">
            <div className="uspf-about-image">
              {aboutImage && (
                <Image
                  src={aboutImage}
                  alt="School books representing educational opportunity"
                  fill
                  sizes="(max-width: 700px) 100vw, 50vw"
                  unoptimized
                />
              )}
            </div>
            <div className="uspf-about-copy">
              <div className="uspf-kicker">{content.about.kicker}</div>
              <h2>{content.about.title}</h2>
              {content.about.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <ContentLink className="uspf-text-link" href={content.about.buttonUrl}>
                {content.about.buttonLabel}
              </ContentLink>
            </div>
          </div>
        </section>

        <section className="uspf-statement">
          <div className="uspf-container">
            <div className="uspf-statement-card">
              <div className="uspf-kicker">{content.statement.kicker}</div>
              <h2>{content.statement.title}</h2>
              <p>{content.statement.body}</p>
            </div>
          </div>
        </section>

        <section className="uspf-section uspf-mission" id="mission">
          <div className="uspf-container">
            <div className="uspf-section-intro uspf-center">
              <div className="uspf-kicker">{content.mission.kicker}</div>
              <h2>{content.mission.title}</h2>
            </div>
            <div className="uspf-split uspf-vision-mission">
              <article>
                <div className="uspf-kicker">{content.mission.visionLabel}</div>
                <h3>{content.mission.visionTitle}</h3>
                <p>{content.mission.visionBody}</p>
              </article>
              <article>
                <div className="uspf-kicker">{content.mission.missionLabel}</div>
                <h3>{content.mission.missionTitle}</h3>
                <p>{content.mission.missionBody}</p>
              </article>
            </div>
            <div className="uspf-principle-grid">
              {content.mission.principles.map((item, index) => (
                <article className="uspf-principle" key={`${item.title}-${index}`}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="uspf-president" id="leadership">
          <div className="uspf-container uspf-split">
            <div className="uspf-president-copy">
              <div className="uspf-kicker">{content.president.kicker}</div>
              <h2>{content.president.title}</h2>
              <blockquote>{content.president.quote}</blockquote>
              {content.president.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <strong className="uspf-signature">{content.president.name}</strong>
              <div className="uspf-president-role">{content.president.role}</div>
            </div>
            <div className="uspf-portrait">
              {presidentImage ? (
                <Image
                  src={presidentImage}
                  alt={content.president.imageAlt}
                  width={560}
                  height={620}
                  unoptimized
                />
              ) : (
                <div className="uspf-portrait-placeholder" aria-hidden="true">
                  USPF
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="uspf-section uspf-advocacy" id="advocacy">
          <div className="uspf-container">
            <div className="uspf-kicker">{content.advocacy.kicker}</div>
            <h2>{content.advocacy.title}</h2>
            <p className="uspf-lead">{content.advocacy.description}</p>
            <div className="uspf-advocacy-grid">
              {content.advocacy.items.map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
            <p className="uspf-note">{content.advocacy.note}</p>
          </div>
        </section>

        <section className="uspf-section uspf-structure" id="structure">
          <div className="uspf-container">
            <div className="uspf-section-intro uspf-center">
              <div className="uspf-kicker">{content.structure.kicker}</div>
              <h2>{content.structure.title}</h2>
              <p>{content.structure.description}</p>
            </div>
            <div className="uspf-structure-grid">
              <article className="uspf-state-leadership">
                <div className="uspf-kicker">State leadership</div>
                <h3>{content.structure.stateTitle}</h3>
                <p>{content.structure.stateBody}</p>
              </article>
              {content.structure.items.map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
            <p className="uspf-note">{content.structure.note}</p>
          </div>
        </section>

        <section className="uspf-section uspf-media" id="media">
          <div className="uspf-container uspf-media-grid">
            <div>
              <div className="uspf-kicker">{content.media.kicker}</div>
              <h2>{content.media.title}</h2>
              <p className="uspf-lead">{content.media.description}</p>
              <ContentLink className="uspf-button uspf-button-dark" href={content.media.buttonUrl}>
                {content.media.buttonLabel}
              </ContentLink>
              <p className="uspf-note">{content.media.note}</p>
            </div>
            <ContentLink className="uspf-video-card" href={content.media.videoUrl}>
              <span className="uspf-play" aria-hidden="true">▶</span>
              <strong>{content.media.videoTitle}</strong>
              <span>{content.media.videoButton}</span>
            </ContentLink>
          </div>
        </section>

        <section className="uspf-cta" id="contact">
          <div className="uspf-container">
            <div>
              <div className="uspf-kicker">{content.cta.kicker}</div>
              <h2>{content.cta.title}</h2>
              <p>{content.cta.description}</p>
            </div>
            <ContentLink className="uspf-button uspf-button-gold" href={content.cta.buttonUrl}>
              {content.cta.buttonLabel}
            </ContentLink>
          </div>
        </section>
      </main>

      <footer className="uspf-footer">
        <div className="uspf-container">
          <div className="uspf-footer-grid">
            <div>
              <div className="uspf-footer-brand">
                <SiteLogo />
                <h3>{content.footer.organization}</h3>
              </div>
              <p>{content.footer.description}</p>
            </div>
            <div>
              <h4>Explore</h4>
              {content.footer.exploreLinks.map((item, index) => (
                <ContentLink key={`${item.label}-${index}`} href={item.url}>
                  {item.label}
                </ContentLink>
              ))}
            </div>
            <div>
              <h4>Connect</h4>
              {content.footer.connectLinks.map((item, index) => (
                <ContentLink key={`${item.label}-${index}`} href={item.url}>
                  {item.label}
                </ContentLink>
              ))}
            </div>
          </div>
          <div className="uspf-copyright">
            <span>© {new Date().getFullYear()} {content.footer.organization} (USPF). All rights reserved.</span>
            <span>{content.footer.copyrightNote}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
