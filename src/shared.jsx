import React, { createContext, useContext } from "react";
import {
  ArrowRight,
  Mail,
  Phone,
  Clock,
  MapPin,
  Building2,
  SquareTerminal,
  Rocket,
  Eye,
  Gauge,
  Wrench,
  Handshake,
  Brain,
  Zap,
  Menu,
  Search,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  faFacebook,
  faLine,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";
const brands = { facebook: faFacebook, line: faLine, linkedin: faLinkedin };
export const Site = createContext(null);
export const useSite = () => useContext(Site);
export const glyphs = {
  ArrowRight,
  Mail,
  Phone,
  Clock,
  MapPin,
  Building2,
  SquareTerminal,
  Rocket,
  Eye,
  Gauge,
  Wrench,
  Handshake,
  Brain,
  Zap,
  Menu,
  Search,
  Square,
  ChevronLeft,
  ChevronRight,
};
export const iconNames = [
  ...Object.keys(glyphs),
  "facebook",
  "line",
  "linkedin",
];
export function Typography({ styles, children }) {
  const vars = {};
  for (const [key, s] of Object.entries(styles))
    for (const [k, v] of Object.entries(s))
      vars[`--${key}-${k}`] = ["size", "tablet", "mobile", "spacing"].includes(
        k,
      )
        ? `${v}px`
        : v;
  return (
    <div className="site-theme" style={vars}>
      {children}
    </div>
  );
}
export function Picture({ value, className = "" }) {
  const { t } = useSite();
  if (!value?.url) return null;
  if (!value.crop)
    return (
      <img
        className={"picture " + className}
        src={value.url}
        alt={t(value.alt)}
        loading="lazy"
      />
    );
  const [x, y, w, h, iw, ih] = value.crop;
  return (
    <svg
      role="img"
      aria-label={t(value.alt)}
      className={"crop " + className}
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ aspectRatio: `${w}/${h}` }}
    >
      <image href={value.url} width={iw} height={ih} />
    </svg>
  );
}
export function Icon({ name, slot = name }) {
  const { content } = useSite();
  const s = content.icons.overrides[slot] ||
    content.icons.shared[name] || {
      name: "ArrowRight",
      color: "#805b00",
      background: "#fff3dc",
    };
  const Glyph = glyphs[s.name];
  return (
    <span
      className="icon"
      aria-hidden="true"
      style={{ color: s.color, backgroundColor: s.background }}
    >
      {s.asset ? (
        s.mode === "mask" && s.asset.endsWith(".svg") ? (
          <span
            className="mask"
            style={{ maskImage: `url(${s.asset})`, backgroundColor: s.color }}
          />
        ) : (
          <img src={s.asset} alt="" />
        )
      ) : Glyph ? (
        <Glyph size={22} />
      ) : brands[s.name] ? (
        <svg
          viewBox={`0 0 ${brands[s.name].icon[0]} ${brands[s.name].icon[1]}`}
          fill="currentColor"
        >
          <path d={brands[s.name].icon[4]} />
        </svg>
      ) : null}
    </span>
  );
}
export function Titles({ lines, as: Tag = "h1" }) {
  const { t } = useSite();
  return (
    <Tag className="type-hero">
      {lines.map((l, i) => (
        <span key={i} style={{ color: l.color }}>
          {t(l.text)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </Tag>
  );
}
export function SectionHeading({ value, slot = "section.marker" }) {
  const { t } = useSite();
  return (
    <div className="section-heading">
      <div className="type-highlight eyebrow">
        <Icon name="marker" slot={slot} />
        {t(value.eyebrow)}
      </div>
      <h2 className="type-heading">{t(value.heading)}</h2>
      <p className="type-body">{t(value.description)}</p>
    </div>
  );
}
