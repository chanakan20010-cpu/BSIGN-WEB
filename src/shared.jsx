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
import {
  siInstagram,
  siTiktok,
  siYoutube,
  siX,
  siThreads,
  siPinterest,
  siSnapchat,
  siReddit,
  siDiscord,
  siTelegram,
  siWhatsapp,
  siBluesky,
  siWechat,
  siSinaweibo,
  siKuaishou,
  siXiaohongshu,
} from "simple-icons";
import { getSocialPlatform, socialIconDefaults } from "./social-catalog";
import { textFormatting } from "./text-format";
export { textFormatProps } from "./text-format";
import "./text-format.css";
const brands = { facebook: faFacebook, line: faLine, linkedin: faLinkedin };
const socialBrands = {
  instagram: siInstagram,
  tiktok: siTiktok,
  youtube: siYoutube,
  x: siX,
  threads: siThreads,
  pinterest: siPinterest,
  snapchat: siSnapchat,
  reddit: siReddit,
  discord: siDiscord,
  telegram: siTelegram,
  whatsapp: siWhatsapp,
  bluesky: siBluesky,
  wechat: siWechat,
  weibo: siSinaweibo,
  kuaishou: siKuaishou,
  xiaohongshu: siXiaohongshu,
};
const socialBrandAssets = { douyin: "/social-brand-assets/douyin.svg" };
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
  ...Object.keys(brands),
  ...Object.keys(socialBrands),
  ...Object.keys(socialBrandAssets),
];
export function Typography({ styles, children }) {
  const vars = {};
  for (const [key, s] of Object.entries(styles))
    for (const [k, v] of Object.entries(s))
      vars[`--${key}-${k}`] =
        k === "font"
          ? ["sans-serif", "serif"].includes(v)
            ? v
            : JSON.stringify(v)
          : ["size", "tablet", "mobile", "spacing"].includes(k)
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
export function FormattedText({
  value,
  as: Tag = "span",
  className = "",
  style,
  children,
  ...props
}) {
  const { t } = useSite();
  const format = textFormatting(value);
  return (
    <Tag
      {...props}
      className={[className, "bs-formatted-text"].filter(Boolean).join(" ")}
      data-text-style={format.role || undefined}
      data-text-align={format.align || undefined}
      data-text-color={format.color ? "custom" : undefined}
      style={{
        ...format.style,
        ...style,
        ...(format.color ? { color: format.color } : {}),
      }}
    >
      {children === undefined ? t(value) : children}
    </Tag>
  );
}
export function Icon({ name, slot = name, value }) {
  const { content } = useSite();
  const s =
    value ||
    content.icons?.overrides?.[slot] ||
    content.icons?.shared?.[name] ||
    (getSocialPlatform(name)
      ? socialIconDefaults(name)
      : {
          name: "ArrowRight",
          color: "#805b00",
          background: "#fff3dc",
        });
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
      ) : socialBrands[s.name] ? (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d={socialBrands[s.name].path} />
        </svg>
      ) : socialBrandAssets[s.name] ? (
        <span
          className="mask"
          style={{
            maskImage: `url(${socialBrandAssets[s.name]})`,
            WebkitMaskImage: `url(${socialBrandAssets[s.name]})`,
            backgroundColor: "currentColor",
          }}
        />
      ) : null}
    </span>
  );
}
export function Titles({ lines, as: Tag = "h1" }) {
  const { t } = useSite();
  return (
    <Tag className="type-hero">
      {lines.map((l, i) => (
        <FormattedText key={i} value={l.text} style={{ color: l.color }}>
          {t(l.text)}
          {i < lines.length - 1 && <br />}
        </FormattedText>
      ))}
    </Tag>
  );
}
export function SectionHeading({ value, slot = "section.marker" }) {
  const { t } = useSite();
  return (
    <div className="section-heading">
      <FormattedText
        as="div"
        value={value.eyebrow}
        className="type-highlight eyebrow"
      >
        <Icon name="marker" slot={slot} />
        {t(value.eyebrow)}
      </FormattedText>
      <FormattedText as="h2" value={value.heading} className="type-heading" />
      <FormattedText as="p" value={value.description} className="type-body" />
    </div>
  );
}
