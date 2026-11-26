import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FontFaces } from "../font-library";
import {
  FormattedText,
  Icon,
  Picture,
  Site,
  Typography,
  useSite,
  textFormatProps,
} from "../shared";
import { isCustomTextColor, textStyleLabels } from "../text-format";
import { logoBackground } from "../logo-appearance";
import publicStyleSheet from "../style.css?inline";
import formatStyleSheet from "../text-format.css?inline";
import "./public-text-preview.css";

const frameDocument = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ตัวอย่างหน้าเว็บไซต์</title></head><body><main id="public-preview-root"></main></body></html>`;
const frameWidths = { size: 1280, tablet: 900, mobile: 390 };

function bundledFontFaces(styles, value) {
  const names = new Set([
    "Noto Sans Thai",
    ...Object.values(styles).map((style) => style.font),
    value?.format?.font,
  ]);
  const result = [];
  function readRules(rules) {
    for (const rule of rules) {
      if (rule.type === 5) {
        const family = rule.style
          .getPropertyValue("font-family")
          .replace(/^['"]|['"]$/g, "");
        if (!family.startsWith("BSIGN Custom ") && names.has(family))
          result.push(rule.cssText);
      } else if (rule.styleSheet) {
        try {
          readRules(rule.styleSheet.cssRules);
        } catch {
          /* Cross-origin styles are not part of the site's bundled fonts. */
        }
      }
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      readRules(sheet.cssRules);
    } catch {
      /* Ignore unrelated cross-origin styles. */
    }
  }
  return result.join("\n");
}

// Keep the sample's surrounding element consistent with the location that
// supplies its inherited typography on the public website.
export function fieldPreviewContext(path = "", page = "") {
  const key = path.split(".").at(-1);
  if (path === "global.brand")
    return page === "footer"
      ? { role: "footerBrand", context: "footerBrand" }
      : { role: "brand", context: "brand" };
  if (/^global\.footerNav\.\d+\.label$/.test(path))
    return { role: "footer", context: "footerMenu" };
  if (/^global\.nav\.\d+\.label$/.test(path))
    return { role: "menu", context: "menu" };
  if (path.startsWith("global.")) {
    if (["company", "contactHeading", "addressHeading"].includes(key))
      return { role: "footerHeading", context: "footerHeading" };
    if (key === "address") return { role: "footer", context: "footer" };
    if (key === "all") return { role: "button", context: "filter" };
    if (["readMore", "back"].includes(key))
      return { role: "menu", context: "text" };
  }
  if (/^(?:home|about|news|contact|cta)\.title\.\d+\.text$/.test(path))
    return {
      role: "hero",
      context: path.startsWith("cta.") ? "ctaTitle" : "text",
    };
  if (path === "contact.heading" || path === "contact.formHeading")
    return { role: "panelHeading", context: "panelHeading" };
  if (path === "contact.socialHeading")
    return { role: "subheading", context: "text" };
  if (/^contact\.fields\.[^.]+\.placeholder$/.test(path))
    return { role: "body", context: "placeholder" };
  if (/^contact\.fields\.[^.]+\.label$/.test(path))
    return { role: "label", context: "label" };
  if (path === "contact.hours") return { role: "intro", context: "text" };
  if (path === "contact.subtitle") return { role: "heading", context: "text" };
  if (/^news\.categories\.\d+\.label$/.test(path))
    return { role: "button", context: "filter" };
  if (/^articles\.(?:title)$/.test(path))
    return { role: "heading", context: "articleTitle" };
  if (path === "articles.lead") return { role: "subheading", context: "text" };
  if (/^(?:home|about)\.intro$/.test(path))
    return { role: "intro", context: "text" };
  if (["cta", "primary", "secondary", "submit"].includes(key))
    return { role: "button", context: "button" };
  if (/\.heading$/.test(path)) return { role: "heading", context: "text" };
  if (
    /\.(?:eyebrow|highlight|badge|emailLabel|phoneLabel|hoursLabel|officeLabel)$/.test(
      path,
    )
  )
    return { role: "highlight", context: "text" };
  if (/\.(?:title|badgeTitle)$/.test(path))
    return { role: "subheading", context: "text" };
  if (/\.name$/.test(path)) return { role: "label", context: "label" };
  if (path.startsWith("cta.")) return { role: "inverse", context: "inverse" };
  return { role: "body", context: "text" };
}

function Sample({ value, role, context, legacyColor, image }) {
  const { t, content, lang } = useSite();
  const hasSelectedRole = Object.hasOwn(textStyleLabels, value?.format?.style);
  // A text preset changes typography, never the element that contains it on
  // the website. Keep that inherited class and structure while FormattedText
  // applies any explicit style overrides, just as the public component does.
  const className = `type-${role}`;
  const props = {
    value,
    className,
    "data-preview-text": "true",
    "data-selected": "true",
    style: isCustomTextColor(legacyColor) ? { color: legacyColor } : undefined,
  };
  const words = t(value).split(" ");
  if (context === "header-logo" || context === "footer-logo") {
    const footer = context === "footer-logo";
    return (
      <div
        className={footer ? "site-footer" : "preview-header-surface"}
        style={footer ? { padding: 20 } : undefined}
      >
        <div
          className={footer ? "footer-logo-box" : "brand"}
          style={
            footer
              ? { background: logoBackground(image, "#ffffff") }
              : undefined
          }
        >
          <Picture value={image} />
        </div>
      </div>
    );
  }
  if (context === "button")
    return (
      <button type="button" className="button type-button" tabIndex={-1}>
        <FormattedText {...props} />
        <Icon name="arrow" slot="cta.arrow" />
      </button>
    );
  if (context === "menu")
    return (
      <header className="site-header preview-menu-header">
        <div className="header-inner">
          <nav
            className="open"
            aria-label={lang === "th" ? "ตัวอย่างเมนู" : "Navigation preview"}
          >
            <a
              className={`active ${className}`}
              aria-current="page"
              style={{ fontWeight: 700 }}
              tabIndex={-1}
            >
              <FormattedText
                {...props}
                style={{ ...props.style, fontWeight: "inherit" }}
              />
            </a>
            <a className={className} style={{ fontWeight: 400 }} tabIndex={-1}>
              <FormattedText
                value={{ th: "เมนูอื่น", en: "Other page" }}
                style={{ fontWeight: "inherit" }}
              />
            </a>
          </nav>
        </div>
      </header>
    );
  if (context === "filter")
    return (
      <div className="filters">
        <button
          className={className}
          type="button"
          aria-pressed="true"
          style={{ fontWeight: 700 }}
          tabIndex={-1}
        >
          <FormattedText
            {...props}
            style={{ ...props.style, fontWeight: "inherit" }}
          />
        </button>
      </div>
    );
  if (context === "brand")
    return (
      <div className="brand preview-brand">
        <FormattedText {...props} as="strong">
          <em>{words[0]}</em>
          {words.length > 1 ? ` ${words.slice(1).join(" ")}` : ""}
        </FormattedText>
      </div>
    );
  if (context.startsWith("footer")) {
    const footerBrand = context === "footerBrand";
    const heading = context === "footerHeading";
    return (
      <div className="site-footer" style={{ padding: 22 }}>
        {footerBrand ? (
          <FormattedText
            {...props}
            as="strong"
            className={`${className} footer-wordmark`}
          >
            <em>{words[0]}</em>
            {words.length > 1 ? ` ${words.slice(1).join(" ")}` : ""}
          </FormattedText>
        ) : context === "footerMenu" ? (
          <nav className="footer-navigation">
            <a
              className={`active ${className}`}
              tabIndex={-1}
              style={{ fontWeight: 700 }}
            >
              <FormattedText
                {...props}
                style={{ ...props.style, fontWeight: "inherit" }}
              />
            </a>
          </nav>
        ) : (
          <FormattedText
            {...props}
            as={heading ? "h2" : "p"}
            className={`${className}${heading ? " footer-label" : ""}`}
          />
        )}
      </div>
    );
  }
  if (context === "placeholder") {
    const formatProps = textFormatProps(value);
    return (
      <input
        {...formatProps}
        className={`${className} ${formatProps.className}`}
        placeholder={t(value)}
        readOnly
        aria-label={
          lang === "th" ? "ตัวอย่างข้อความในช่องกรอก" : "Placeholder preview"
        }
        data-preview-text="true"
        data-selected="true"
      />
    );
  }
  if (context === "label") return <FormattedText {...props} as="label" />;
  if (context === "panelHeading")
    return (
      <FormattedText
        {...props}
        as="h2"
        className={`${className} contact-section-title`}
      />
    );
  if (context === "articleTitle")
    return (
      <div className="article-hero preview-article-title">
        <FormattedText
          {...props}
          as="h1"
          style={{
            ...(!hasSelectedRole
              ? { color: content.news?.articleTitleColor }
              : {}),
            ...props.style,
          }}
        />
      </div>
    );
  if (context === "inverse" || context === "ctaTitle")
    return (
      <section className="cta preview-cta">
        <FormattedText {...props} as={context === "ctaTitle" ? "h2" : "p"} />
      </section>
    );
  return (
    <FormattedText
      {...props}
      as={
        role === "hero"
          ? "h1"
          : role === "heading"
            ? "h2"
            : role === "subheading"
              ? "h3"
              : "p"
      }
    />
  );
}

export default function PublicTextPreview({
  value,
  role = "body",
  language = "th",
  styles,
  viewport = "size",
  context = "text",
  legacyColor,
  image,
  title = "ตัวอย่างก่อนบันทึก",
  className = "",
}) {
  const site = useSite();
  const iframe = useRef(null);
  const host = useRef(null);
  const [mount, setMount] = useState(null);
  const [height, setHeight] = useState(180);
  const [width, setWidth] = useState(420);
  const [visible, setVisible] = useState(false);
  const theme = styles || site?.content?.styles || {};
  const sample = value || { th: "ตัวอย่างข้อความ", en: "Text preview" };
  const previewSite = useMemo(
    () => ({
      ...site,
      lang: language,
      t: (text) => (typeof text === "string" ? text : text?.[language] || ""),
      content: { ...site?.content, styles: theme },
    }),
    [site, language, theme],
  );
  const measure = useCallback(() => {
    const root = iframe.current?.contentDocument?.getElementById(
      "public-preview-root",
    );
    if (root)
      setHeight(
        Math.min(
          720,
          Math.max(128, Math.ceil(root.getBoundingClientRect().height + 2)),
        ),
      );
  }, []);
  const prepare = useCallback(() => {
    const doc = iframe.current?.contentDocument;
    if (!doc) return;
    const siteStyles = doc.createElement("style");
    siteStyles.textContent = publicStyleSheet + "\n" + formatStyleSheet;
    doc.head.append(siteStyles);
    const fonts = doc.createElement("style");
    fonts.dataset.previewFontFaces = "true";
    doc.head.append(fonts);
    const layout = doc.createElement("style");
    layout.textContent = `html,body{margin:0;padding:0;min-width:0;background:transparent}#public-preview-root{display:flow-root} [data-public-preview-canvas]{padding:18px;min-width:0;max-height:680px;overflow:auto;overflow-wrap:anywhere;box-sizing:border-box}.cms-style-preview-paper,.cms-selected-type-sample{min-width:0}.preview-menu-header{position:static}.preview-menu-header .header-inner{min-height:0;width:100%;padding:0}.preview-menu-header nav{position:static;display:flex}.preview-brand{padding:5px 0}.preview-article-title{background:linear-gradient(135deg,#293443,#0a1018);min-height:160px}.preview-article-title h1{position:static}.preview-cta{display:block;padding:24px}input[data-preview-text]{width:100%}`;
    doc.head.append(layout);
    setMount(doc.getElementById("public-preview-root"));
  }, [measure]);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(140, entry.contentRect.width)),
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // Mount lazily, then retain the real preview document until its field
        // unmounts. Scrolling or accessibility inspection must not replace a
        // frame while a tool is reading or focusing its contents.
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "320px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!mount) return;
    const doc = mount.ownerDocument;
    // Moving a paragraph can detach and reload its iframe. The old document
    // may still have a FontFaceSet but no ready promise during that transition.
    if (!mount.isConnected || doc !== iframe.current?.contentDocument) return;
    let active = true;
    const measureCurrent = () => {
      if (
        active &&
        mount.isConnected &&
        doc === iframe.current?.contentDocument
      )
        measure();
    };
    doc.documentElement.lang = language;
    const faces = doc.head.querySelector("[data-preview-font-faces]");
    if (faces) faces.textContent = bundledFontFaces(theme, sample);
    const observer = new ResizeObserver(measureCurrent);
    observer.observe(mount);
    doc.fonts?.ready?.then(measureCurrent);
    measureCurrent();
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [mount, language, value, styles, viewport, context, image, measure]);
  const effectiveRole = Object.hasOwn(textStyleLabels, sample?.format?.style)
    ? sample.format.style
    : role;
  return (
    <div
      ref={host}
      className={`cms-public-text-preview ${className}`}
      data-preview-role={effectiveRole}
      style={{ minHeight: height }}
    >
      {visible && (
        <iframe
          ref={iframe}
          className="cms-public-text-frame"
          title={title}
          // The document template is static and all field values are escaped
          // React children. Keep this trusted same-origin frame script-capable
          // so keyboard/accessibility tools can inspect its real DOM as well.
          srcDoc={frameDocument}
          onLoad={prepare}
          data-preview-role={effectiveRole}
          data-preview-context={context}
          style={{ width: frameWidths[viewport] || frameWidths.size, height }}
        />
      )}
      {visible &&
        mount &&
        createPortal(
          <Site.Provider value={previewSite}>
            <FontFaces />
            <Typography styles={theme}>
              <div
                data-public-preview-canvas
                style={{
                  width: Math.min(
                    width,
                    frameWidths[viewport] || frameWidths.size,
                  ),
                }}
                lang={language}
              >
                <div className="cms-style-preview-paper cms-selected-type-sample">
                  <Sample
                    value={sample}
                    role={role}
                    context={context}
                    legacyColor={legacyColor}
                    image={image}
                  />
                </div>
              </div>
            </Typography>
          </Site.Provider>,
          mount,
        )}
    </div>
  );
}
