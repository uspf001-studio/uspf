"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type HeroSlide = {
  id: string;
  tag: string;
  heading: string;
  accent_heading: string;
  description: string;
  image_url: string;
  button_text: string;
  button_url: string;
  frame_border_width: number;
  image_border_width: number;
};

const defaultSlides: HeroSlide[] = [
  {
    id: "schools",
    tag: "Pillar 01 · Our first priority",
    heading: "Safe Schools.",
    accent_heading: "Stronger Education.",
    description:
      "Protecting institutional dignity, advocating for transparent governance, and promoting safe, responsibly managed educational environments.",
    image_url:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1800&q=85",
    button_text: "Explore School Protection →",
    button_url: "/#advocacy",
    frame_border_width: 12,
    image_border_width: 10,
  },
  {
    id: "teachers",
    tag: "Pillar 02 · Professional dignity",
    heading: "Respect Teachers.",
    accent_heading: "Protect Their Rights.",
    description:
      "Standing for teachers' dignity, fair treatment, professional security and respectful working environments.",
    image_url:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=85",
    button_text: "Explore Teacher Protection →",
    button_url: "/#mission",
    frame_border_width: 12,
    image_border_width: 10,
  },
  {
    id: "children",
    tag: "Pillar 03 · Every child matters",
    heading: "Every Child Deserves",
    accent_heading: "a Safe Future.",
    description:
      "Advancing student well-being, child protection awareness, dignity and nurturing spaces for learning.",
    image_url:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1800&q=85",
    button_text: "Discover Child Protection →",
    button_url: "/#mission",
    frame_border_width: 12,
    image_border_width: 10,
  },
];

function safeDestination(value: string) {
  if ((value.startsWith("/") && !value.startsWith("//")) || value.startsWith("#")) {
    return value;
  }
  if (/^https?:\/\/\S+$/i.test(value)) return value;
  return "#";
}

export default function Hero({
  discoverButtonLabel,
  discoverButtonUrl,
}: {
  discoverButtonLabel: string;
  discoverButtonUrl: string;
}) {
  const [slides, setSlides] = useState(defaultSlides);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadSlides() {
      const { data, error } = await createClient()
        .from("homepage_slides")
        .select("id, tag, heading, accent_heading, description, image_url, button_text, button_url, frame_border_width, image_border_width")
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Homepage hero slides could not be loaded:", error.message);
        return;
      }

      if (mounted && data?.length) {
        setSlides(data as HeroSlide[]);
        setActive(0);
      }
    }

    void loadSlides();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const slide = slides[active];
  if (!slide) return null;

  const slideUrl = safeDestination(slide.button_url);
  const discoverUrl = safeDestination(discoverButtonUrl);
  const slideExternal = /^https?:\/\//i.test(slideUrl);
  const discoverExternal = /^https?:\/\//i.test(discoverUrl);

  return (
    <section
      className="uspf-hero"
      style={{
        "--hero-frame-border-width": `${slide.frame_border_width}px`,
        "--hero-image-border-width": `${slide.image_border_width}px`,
      } as CSSProperties}
      aria-label="USPF mission highlights"
    >
      {slides.map((item, index) => (
        <div
          key={item.id}
          className={`uspf-hero-slide${index === active ? " is-active" : ""}`}
          aria-hidden={index !== active}
        >
          <div
            className="uspf-hero-photo"
            style={{ backgroundImage: `url("${item.image_url.replace(/["\\\n\r]/g, "")}")` }}
          />
          <div className="uspf-hero-shade" />
        </div>
      ))}
      <div className="uspf-container uspf-hero-content">
        <div className="uspf-hero-copy" key={slide.id}>
          <div className="uspf-hero-eyebrow">{slide.tag}</div>
          <h1>
            {slide.heading}
            {slide.accent_heading && <><br /><span>{slide.accent_heading}</span></>}
          </h1>
          <p>{slide.description}</p>
          <div className="uspf-hero-actions">
            {slideExternal ? (
              <a className="uspf-button uspf-button-gold" href={slideUrl} target="_blank" rel="noopener noreferrer">
                {slide.button_text}
              </a>
            ) : (
              <Link className="uspf-button uspf-button-gold" href={slideUrl}>
                {slide.button_text}
              </Link>
            )}
            {discoverExternal ? (
              <a className="uspf-button uspf-button-outline" href={discoverUrl} target="_blank" rel="noopener noreferrer">
                {discoverButtonLabel}
              </a>
            ) : (
              <Link className="uspf-button uspf-button-outline" href={discoverUrl}>
                {discoverButtonLabel}
              </Link>
            )}
          </div>
        </div>
        <div className="uspf-hero-controls">
          <div className="uspf-slide-dots" aria-label="Choose a homepage slide">
            {slides.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={index === active ? "is-active" : ""}
                aria-label={`Show slide ${index + 1}`}
                aria-current={index === active}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
          <div className="uspf-slide-actions">
            <button type="button" aria-label="Previous slide" onClick={() => setActive((active + slides.length - 1) % slides.length)}>‹</button>
            <button
              type="button"
              aria-label={paused ? "Play slides" : "Pause slides"}
              onClick={() => setPaused((current) => !current)}
            >
              {paused ? "▶" : "Ⅱ"}
            </button>
            <button type="button" aria-label="Next slide" onClick={() => setActive((active + 1) % slides.length)}>›</button>
          </div>
        </div>
      </div>
    </section>
  );
}
