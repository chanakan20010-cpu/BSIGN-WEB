import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/700.css";
import { api } from "./api";
import {
  Site,
  useSite,
  Typography,
  Picture,
  Icon,
  Titles,
  SectionHeading,
  FormattedText,
  textFormatProps,
} from "./shared";
import Admin from "./Admin";
import Setup from "./Setup";
import MaintenancePage from "./MaintenancePage";
import "./style.css";
function App() {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(false);
  const [lang, setLang] = useState(
    localStorage.getItem("bsign-lang") === "en" ? "en" : "th",
  );
  const location = useLocation();
  const contentRef = useRef(content);
  contentRef.current = content;
  useEffect(() => {
    api("/content")
      .then(setContent)
      .catch(() => setError(true));
    if (location.pathname !== "/setup") api("/session").catch(() => {});
  }, []);
  useEffect(() => {
    if (
      location.pathname.startsWith("/admin") ||
      location.pathname === "/setup"
    )
      return;
    let cancelled = false,
      checking = false;
    async function checkStatus() {
      if (checking) return;
      checking = true;
      try {
        const { maintenance } = await api("/status");
        if (cancelled || !contentRef.current) return;
        if (maintenance.enabled) {
          setContent((current) => ({ ...current, maintenance }));
        } else if (contentRef.current.maintenance?.enabled) {
          const fullContent = await api("/content");
          if (!cancelled) setContent(fullContent);
        }
      } catch {
        /* Keep the last confirmed state during a temporary connection failure. */
      } finally {
        checking = false;
      }
    }
    checkStatus();
    const timer = setInterval(checkStatus, 3000);
    window.addEventListener("focus", checkStatus);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", checkStatus);
    };
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("bsign-lang", lang);
  }, [lang]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (!content) return;
    document.title = content.global.brand[lang];
    let f = document.querySelector("link[rel=icon]");
    if (content.global.favicon) {
      if (!f) {
        f = document.createElement("link");
        f.rel = "icon";
        document.head.append(f);
      }
      f.href = content.global.favicon;
    }
  }, [content, lang]);
  if (!content)
    return (
      <p role="status">
        {error
          ? "ไม่สามารถโหลดข้อมูล / Unable to load content"
          : "กำลังโหลด / Loading…"}
      </p>
    );
  const t = (v) => (typeof v === "string" ? v : v?.[lang] || "");
  return (
    <Site.Provider value={{ content, setContent, lang, setLang, t }}>
      <Typography styles={content.styles || {}}>
        {location.pathname === "/setup" ? (
          <Setup />
        ) : location.pathname.startsWith("/admin") ? (
          <Admin />
        ) : content.maintenance?.enabled ? (
          <MaintenancePage />
        ) : (
          <>
            <Header />
            <main id="main" tabIndex={-1}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/news" element={<News />} />
                <Route path="/news/:slug" element={<Article />} />
                <Route path="/contact" element={<Contact />} />
                <Route
                  path="/privacy"
                  element={
                    <div className="container section">
                      <FormattedText
                        as="h1"
                        className="type-hero"
                        value={content.global.privacyLabel}
                      />
                      <FormattedText
                        as="p"
                        className="type-body prose"
                        value={content.global.privacy}
                      />
                    </div>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="container section">
                      <FormattedText
                        as="h1"
                        className="type-hero"
                        value={content.global.notFound}
                      />
                    </div>
                  }
                />
              </Routes>
            </main>
            <Footer />
          </>
        )}
      </Typography>
    </Site.Provider>
  );
}
function Header() {
  const {
    content: { global: g },
    lang,
    setLang,
    t,
  } = useSite();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location]);
  return (
    <>
      <a className="skip" href="#main">
        <FormattedText value={g.skip} />
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label={t(g.brand)}>
            <Picture value={g.logo} />
            <FormattedText as="strong" className="type-brand" value={g.brand}>
              <em>{t(g.brand).split(" ")[0]}</em>{" "}
              {t(g.brand).split(" ").slice(1).join(" ")}
            </FormattedText>
            <span className="sr-only">{t(g.brand)}</span>
          </Link>
          <button
            className="mobile-menu"
            aria-expanded={open}
            aria-controls="navigation"
            aria-label={t(g.menuLabel)}
            onClick={() => setOpen(!open)}
          >
            <Icon name="menu" slot="header.menu" />
          </button>
          <nav
            id="navigation"
            className={open ? "open" : ""}
            aria-label={t(g.menuLabel)}
          >
            {g.nav.map((n, i) => (
              <NavLink
                className="type-menu"
                key={i}
                to={n.href}
                end={n.href === "/"}
              >
                <FormattedText value={n.label} />
              </NavLink>
            ))}
          </nav>
          <div className="languages">
            {["th", "en"].map((l) => (
              <button
                key={l}
                lang={l}
                className="type-menu"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
              >
                {g.languages[l]}
              </button>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}
function Footer() {
  const {
    content: { global: g },
    t,
  } = useSite();
  const brand = t(g.brand).split(" ");
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo-box">
            <Picture value={g.footerLogo || g.logo} />
          </div>
          <div className="footer-brand-copy">
            <FormattedText
              as="strong"
              className="type-footerBrand footer-wordmark"
              value={g.brand}
            >
              <em>{brand[0]}</em>
              {brand.length > 1 ? " " + brand.slice(1).join(" ") : ""}
            </FormattedText>
            <FormattedText
              as="p"
              className="type-footerHeading footer-company"
              value={g.company}
            />
          </div>
        </div>
        <nav className="footer-navigation" aria-label={t(g.menuLabel)}>
          {(g.footerNav || g.nav).map((n, i) => (
            <NavLink
              className="type-footer"
              key={i}
              to={n.href}
              end={n.href === "/"}
            >
              <FormattedText value={n.label} />
            </NavLink>
          ))}
        </nav>
        <section className="footer-contact">
          <FormattedText
            as="h2"
            className="footer-label type-footerHeading"
            value={g.contactHeading}
          />
          <a className="type-footer contact-line" href={"mailto:" + g.email}>
            <Icon name="mail" slot="footer.mail" />
            <span>{g.email}</span>
          </a>
          <a className="type-footer contact-line" href={"tel:" + g.phone}>
            <Icon name="phone" slot="footer.phone" />
            <span>{g.phone}</span>
          </a>
        </section>
        <section className="footer-address">
          <FormattedText
            as="h2"
            className="footer-label type-footerHeading"
            value={g.addressHeading}
          />
          <div className="contact-line">
            <Icon name="pin" slot="footer.pin" />
            <FormattedText as="p" className="type-footer" value={g.address} />
          </div>
        </section>
      </div>
    </footer>
  );
}
function CTA() {
  const {
    content: { cta: c },
    t,
  } = useSite();
  return (
    <section className="cta">
      <div>
        <FormattedText as="div" className="type-highlight" value={c.eyebrow} />
        <Titles as="h2" lines={c.title} />
        <FormattedText as="p" className="type-inverse" value={c.body} />
      </div>
      <div className="cta-actions">
        <Link className="button type-button" to={c.primaryHref}>
          <FormattedText value={c.primary} />
          <Icon name="arrow" slot="cta.arrow" />
        </Link>
        <Link className="button secondary type-button" to={c.secondaryHref}>
          <FormattedText value={c.secondary} />
        </Link>
      </div>
    </section>
  );
}
function Home() {
  const {
    content: { home: h, news: n },
    t,
  } = useSite();
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <Titles lines={h.title} />
            <FormattedText as="p" className="type-intro" value={h.intro} />
            <Link className="button type-button" to={h.ctaHref}>
              <FormattedText value={h.cta} />
              <Icon name="arrow" slot="home.hero.arrow" />
            </Link>
          </div>
          <Picture value={h.hero} />
        </div>
      </section>
      <section className="services section">
        <div className="container">
          <SectionHeading value={h.services} slot="home.services.marker" />
          <div className="cards three">
            {h.cards.map((c, i) => (
              <article className="service card" key={i}>
                <Icon
                  name="terminal"
                  slot={`home.service.${i}`}
                  value={c.icon}
                />
                <FormattedText
                  as="p"
                  className="type-highlight"
                  value={c.eyebrow}
                />
                <FormattedText
                  as="h3"
                  className="type-subheading"
                  value={c.title}
                />
                <FormattedText as="p" className="type-body" value={c.body} />
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="container section why">
        <div className="team">
          <Picture value={h.team} />
          <div className="team-badge">
            <div>
              <FormattedText
                as="div"
                className="type-highlight"
                value={h.badge}
              />
              <FormattedText
                as="strong"
                className="type-subheading"
                value={h.badgeTitle}
              />
            </div>
            <Icon name="bolt" slot="home.badge" />
          </div>
        </div>
        <div>
          <SectionHeading value={h.why} slot="home.why.marker" />
          <div className="advantages">
            {h.advantages.map((a, i) => (
              <article key={i}>
                <Icon
                  name="rocket"
                  slot={`home.advantage.${i}`}
                  value={a.icon}
                />
                <div>
                  <FormattedText
                    as="h3"
                    className="type-subheading"
                    value={a.title}
                  />
                  <FormattedText as="p" className="type-body" value={a.body} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="container section">
        <SectionHeading value={n.section} slot="news.section.marker" />
        <NewsCards limit={3} category={h.newsCategory} />
      </section>
    </>
  );
}
function About() {
  const {
    content: { about: a },
    t,
  } = useSite();
  return (
    <div className="container">
      <section className="hero-grid about-hero section">
        <div>
          <Titles lines={a.title} />
          <FormattedText as="p" className="type-intro" value={a.intro} />
        </div>
        <div className="matrix card">
          <div className="matrix-caption type-highlight">
            <FormattedText value={a.matrix} />
            <FormattedText value={a.version} />
          </div>
          <Picture value={a.hero} />
          <div className="method">
            <FormattedText as="p" className="type-highlight" value={a.method} />
            <FormattedText
              as="strong"
              className="type-subheading"
              value={a.methodTitle}
            />
          </div>
          <div className="stats">
            {a.stats.map((s, i) => (
              <div key={i}>
                <FormattedText
                  as="strong"
                  className="type-heading"
                  value={s.value}
                />
                <FormattedText as="p" className="type-body" value={s.label} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <SectionHeading value={a.vision} slot="about.vision.marker" />
        <div className="cards two">
          {a.missions.map((m, i) => (
            <article className="card mission" key={i}>
              <h3 className="type-subheading">
                <Icon
                  name={i ? "rocket" : "eye"}
                  slot={`about.mission.${i}`}
                  value={m.icon}
                />
                <FormattedText value={m.title} />
              </h3>
              <FormattedText
                as="blockquote"
                className="type-highlight"
                value={m.quote}
              >
                “ {t(m.quote)} ”
              </FormattedText>
              <FormattedText as="p" className="type-body" value={m.body} />
            </article>
          ))}
        </div>
      </section>
      <section className="section">
        <SectionHeading value={a.values} slot="about.values.marker" />
        <div className="cards four">
          {a.cards.map((c, i) => (
            <article className="card value-card" key={i}>
              <div className="value-top">
                <Icon
                  name={["speed", "engineering", "heart", "brain"][i % 4]}
                  slot={`about.value.${i}`}
                  value={c.icon}
                />
                <span className="type-highlight">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <FormattedText
                as="h3"
                className="type-subheading"
                value={c.title}
              />
              <FormattedText
                as="p"
                className="type-highlight"
                value={c.highlight}
              />
              <FormattedText as="p" className="type-body" value={c.body} />
              <p className="type-body value-foot">
                <Icon
                  name="marker"
                  slot={`about.foot.${i}`}
                  value={c.footIcon}
                />
                <FormattedText value={c.foot} />
              </p>
            </article>
          ))}
        </div>
      </section>
      <CTA />
    </div>
  );
}
function NewsCard({ a }) {
  const {
    content: { global: g, news: n },
    t,
    lang,
  } = useSite();
  return (
    <article className="card news-card">
      <Link
        className="news-card-media"
        to={"/news/" + a.slug}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Picture value={a.image} />
      </Link>
      <div className="news-card-body">
        <span className="category type-highlight">
          <Icon name="marker" slot="news.category" />
          <FormattedText
            value={n.categories.find((c) => c.id === a.category)?.label}
          />
        </span>
        <h3 className="type-subheading">
          <Link to={"/news/" + a.slug}>
            <FormattedText value={a.title} />
          </Link>
        </h3>
        <FormattedText as="p" className="type-body excerpt" value={a.excerpt} />
        <div className="card-bottom">
          <time className="type-body" dateTime={a.publishedAt}>
            {new Date(a.publishedAt).toLocaleDateString(
              lang === "th" ? "th-TH-u-ca-gregory" : "en-GB",
              { day: "2-digit", month: "short", year: "numeric" },
            )}
          </time>
          <Link className="type-menu" to={"/news/" + a.slug}>
            <FormattedText value={g.readMore} />
            <Icon name="arrow" slot="news.card.arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}
function NewsCards({ limit = 6, exclude, category = "" }) {
  const {
    lang,
    content: { global: g },
    t,
  } = useSite();
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api("/articles?" + new URLSearchParams({ lang, category }))
      .then((x) =>
        setItems(x.items.filter((i) => i.id !== exclude).slice(0, limit)),
      )
      .catch(() => setFailed(true));
  }, [lang, limit, exclude, category]);
  return (
    <div className="cards three news-grid">
      {items ? (
        items.map((a) => <NewsCard a={a} key={a.id} />)
      ) : (
        <p role="status" className="type-body">
          <FormattedText value={failed ? g.error : g.loading} />
        </p>
      )}
    </div>
  );
}
function News() {
  const {
    content: { news: n, global: g },
    t,
    lang,
  } = useSite();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const page = Number(params.get("page") || 1),
    category = params.get("category") || "";
  useEffect(() => {
    let active = true;
    setError(false);
    api(
      "/articles?" +
        new URLSearchParams({ lang, q: params.get("q") || "", category, page }),
    )
      .then((x) => active && setData(x))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [params, lang]);
  const filter = (values) =>
    setParams({ ...Object.fromEntries(params), page: "1", ...values });
  return (
    <div className="container news-page">
      <section className="section">
        <Titles lines={n.title} />
        <div className="filter-bar">
          <div className="filters">
            {[{ id: "", label: g.all }, ...n.categories].map((c) => (
              <button
                key={c.id}
                className="type-button"
                aria-pressed={category === c.id}
                onClick={() => filter({ category: c.id })}
              >
                <FormattedText value={c.label} />
              </button>
            ))}
          </div>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              filter({ q: query });
            }}
          >
            <label className="sr-only" htmlFor="news-search">
              <FormattedText value={g.search} />
            </label>
            <Icon name="search" slot="news.search" />
            <input
              id="news-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="button type-button">
              <FormattedText value={g.search} />
            </button>
          </form>
        </div>
        {error ? (
          <p role="alert">
            <FormattedText value={g.error} />
          </p>
        ) : !data ? (
          <p role="status">
            <FormattedText value={g.loading} />
          </p>
        ) : (
          <>
            {page === 1 && !category && !params.get("q") && data.items[0] && (
              <article className="featured card">
                <Link
                  className="featured-media"
                  to={"/news/" + data.items[0].slug}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Picture value={data.items[0].image} />
                </Link>
                <div>
                  <span className="category type-highlight">
                    <Icon name="marker" slot="news.latest" />
                    <FormattedText value={n.latest} />
                  </span>
                  <FormattedText
                    as="h2"
                    className="type-heading"
                    value={data.items[0].title}
                  />
                  <FormattedText
                    as="p"
                    className="type-body"
                    value={data.items[0].excerpt}
                  />
                  <Link
                    className="button type-button"
                    to={"/news/" + data.items[0].slug}
                  >
                    <FormattedText value={g.readMore} />
                    <Icon name="arrow" slot="news.featured.arrow" />
                  </Link>
                </div>
              </article>
            )}
            <SectionHeading value={n.section} slot="news.section.marker" />
            <div className="cards three news-grid">
              {data.items
                .filter(
                  (a, i) =>
                    !(i === 0 && page === 1 && !category && !params.get("q")),
                )
                .map((a) => (
                  <NewsCard key={a.id} a={a} />
                ))}
            </div>
            {!data.total && (
              <p role="status">
                <FormattedText value={g.empty} />
              </p>
            )}
            <nav className="pagination" aria-label={t(n.section.heading)}>
              <button
                disabled={page <= 1}
                onClick={() => filter({ page: String(page - 1) })}
              >
                <Icon name="previous" slot="news.previous" />
                <FormattedText value={g.previous} />
              </button>
              <span>
                {page} / {Math.max(1, data.pages)}
              </span>
              <button
                disabled={page >= data.pages}
                onClick={() => filter({ page: String(page + 1) })}
              >
                <FormattedText value={g.next} />
                <Icon name="next" slot="news.next" />
              </button>
            </nav>
          </>
        )}
      </section>
      <CTA />
    </div>
  );
}
const articleImageRatios = {
  "16:9": "16 / 9",
  "4:3": "4 / 3",
  "1:1": "1 / 1",
  "3:4": "3 / 4",
};
function ArticleParagraph({ block }) {
  const { t } = useSite();
  const text = t(block.text);
  const ratio = articleImageRatios[block.ratio] ? block.ratio : "original";
  const align = ["left", "right"].includes(block.align)
    ? block.align
    : "center";
  if (!text.trim() && !block.image?.url) return null;
  return (
    <div className="article-paragraph" data-align={align}>
      {block.image?.url && (
        <figure
          className="article-paragraph-image"
          data-ratio={ratio}
          style={{ "--article-image-ratio": articleImageRatios[ratio] }}
        >
          <Picture value={block.image} />
        </figure>
      )}
      {text.trim() && (
        <FormattedText as="p" className="prose type-body" value={block.text} />
      )}
    </div>
  );
}
function ArticleContent({ article }) {
  const { t } = useSite();
  // An explicitly empty block list is an intentional empty body. Older records
  // retain their original fields until the editor saves a block-based body.
  if (Array.isArray(article.blocks))
    return (
      <div className="article-paragraphs">
        {article.blocks.map((block, i) => (
          <ArticleParagraph key={block.id || i} block={block} />
        ))}
      </div>
    );
  const normalise = (value) => value.replace(/\s+/g, " ").trim();
  const body = t(article.body).trim();
  const lead = t(article.lead || article.excerpt).trim();
  const secondary = t(article.secondaryBody).trim();
  return (
    <div className="article-paragraphs">
      {lead &&
        (body || secondary) &&
        normalise(lead) !== normalise(body) &&
        !normalise(body).includes(normalise(lead)) && (
          <FormattedText
            as="p"
            className="type-subheading article-lead"
            value={article.lead || article.excerpt}
          >
            {lead}
          </FormattedText>
        )}
      {(body || (!secondary && lead)).split(/\n\s*\n/).map((paragraph, i) =>
        paragraph.trim() ? (
          <FormattedText
            as="p"
            className="prose type-body"
            key={i}
            value={body ? article.body : article.lead || article.excerpt}
          >
            {paragraph}
          </FormattedText>
        ) : null,
      )}
      {(secondary || article.inlineImage?.url) && (
        <ArticleParagraph
          block={{
            text: article.secondaryBody,
            image: article.inlineImage,
            align: "left",
            ratio: "original",
          }}
        />
      )}
    </div>
  );
}
function Article() {
  const { slug } = useParams();
  const {
    content: { news: n, global: g },
    t,
  } = useSite();
  const [a, setA] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setA(null);
    setError("");
    api("/articles/" + slug)
      .then(setA)
      .catch((e) => setError(e.message));
  }, [slug]);
  return (
    <div className="container section">
      {a ? (
        <>
          <article className="article card">
            <div className="article-hero">
              <Picture value={a.heroImage?.url ? a.heroImage : a.image} />
              <FormattedText
                as="h1"
                className="type-heading"
                value={a.title}
                style={
                  !a.title.format?.style || a.title.format.style === "inherit"
                    ? { color: n.articleTitleColor }
                    : undefined
                }
              />
            </div>
            <div className="article-body">
              <ArticleContent article={a} />
              {a.gallery?.length > 0 && (
                <>
                  <FormattedText
                    as="h2"
                    className="type-heading"
                    value={n.gallery}
                  />
                  <div className="cards three article-gallery">
                    {a.gallery.map((v, i) => (
                      <div className="article-gallery-image" key={i}>
                        <Picture value={v} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </article>
          <section className="section">
            <SectionHeading value={{ ...n.section, heading: n.related }} />
            <NewsCards exclude={a.id} limit={3} />
          </section>
        </>
      ) : (
        <p role="status">
          <FormattedText
            value={
              error ? (error === "NOT_FOUND" ? g.notFound : g.error) : g.loading
            }
          />
        </p>
      )}
      <Link className="type-menu" to="/news">
        <FormattedText value={g.back} />
      </Link>
    </div>
  );
}
function Contact() {
  const {
    content: { contact: c, global: g },
    t,
  } = useSite();
  const [state, setState] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setState("pending");
    const f = e.currentTarget;
    const b = Object.fromEntries(new FormData(f));
    b.consent = b.consent === "on";
    try {
      await api("/contact", { method: "POST", body: b });
      setState("success");
      f.reset();
    } catch {
      setState("error");
    }
  };
  const coords = `${c.map.latitude},${c.map.longitude}`;
  return (
    <div className="container section">
      <div className="contact-banner">
        <Titles lines={c.title} />
        <FormattedText as="h2" className="type-heading" value={c.subtitle} />
      </div>
      <div className="contact-grid">
        <div>
          <section className="card contact-info">
            <FormattedText
              as="h2"
              className="outlined type-heading"
              value={c.heading}
            />
            {[
              [
                "mail",
                c.emailLabel,
                <a href={"mailto:" + c.email}>{c.email}</a>,
              ],
              ["phone", c.phoneLabel, <a href={"tel:" + g.phone}>{g.phone}</a>],
              [
                "clock",
                c.hoursLabel,
                <>
                  <FormattedText value={c.hours} />
                  <FormattedText
                    as="small"
                    className="type-body"
                    value={c.closed}
                  />
                </>,
              ],
            ].map(([icon, label, value]) => (
              <div className="contact-line" key={icon}>
                <Icon name={icon} slot={"contact." + icon} />
                <div>
                  <FormattedText
                    as="div"
                    className="type-highlight"
                    value={label}
                  />
                  <div className="type-intro">{value}</div>
                </div>
              </div>
            ))}
          </section>
          <section className="card social">
            <FormattedText
              as="h2"
              className="type-subheading"
              value={c.socialHeading}
            />
            <div>
              {c.socials.map((s, i) => {
                const inner = (
                  <>
                    <Icon name={s.icon} slot={"social." + i} />
                    <FormattedText
                      as="strong"
                      className="type-label"
                      value={s.name}
                    />
                    <span className="type-body">{s.handle}</span>
                  </>
                );
                return s.href ? (
                  <a
                    key={i}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={i}>{inner}</div>
                );
              })}
            </div>
          </section>
        </div>
        <section className="card form-card">
          <FormattedText
            as="h2"
            className="outlined type-heading"
            value={c.formHeading}
          />
          <form onSubmit={submit}>
            <div className="form-grid">
              {Object.entries(c.fields).map(([key, f]) => (
                <label key={key} className={"type-label field-" + key}>
                  <FormattedText value={f.label} />
                  {["name", "email", "message"].includes(key) && " *"}
                  {key === "message" ? (
                    <textarea
                      {...textFormatProps(f.placeholder)}
                      className={
                        "type-body " + textFormatProps(f.placeholder).className
                      }
                      name={key}
                      required
                      minLength={5}
                      maxLength={5000}
                      placeholder={t(f.placeholder)}
                    />
                  ) : (
                    <input
                      {...textFormatProps(f.placeholder)}
                      className={
                        "type-body " + textFormatProps(f.placeholder).className
                      }
                      name={key}
                      type={
                        key === "email"
                          ? "email"
                          : key === "phone"
                            ? "tel"
                            : "text"
                      }
                      required={["name", "email"].includes(key)}
                      minLength={key === "name" ? 2 : undefined}
                      maxLength={key === "email" ? 254 : 150}
                      autoComplete={
                        {
                          name: "name",
                          email: "email",
                          phone: "tel",
                          company: "organization",
                        }[key]
                      }
                      placeholder={t(f.placeholder)}
                    />
                  )}
                </label>
              ))}
            </div>
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="honeypot"
            />
            <label className="consent type-body">
              <input type="checkbox" name="consent" required />
              <FormattedText value={c.consent} />{" "}
              <Link to="/privacy">
                <FormattedText value={g.privacyLabel} />
              </Link>
            </label>
            <button
              disabled={state === "pending"}
              className="button type-button"
            >
              <FormattedText
                value={state === "pending" ? c.pending : c.submit}
              />
              <Icon name="arrow" slot="contact.submit" />
            </button>
            <p role="status" className="type-body">
              <FormattedText
                value={
                  state === "success"
                    ? c.success
                    : state === "error"
                      ? g.error
                      : ""
                }
              />
            </p>
          </form>
        </section>
      </div>
      <section className="card office">
        <div className="contact-line">
          <Icon name="building" slot="contact.office" />
          <div>
            <FormattedText
              as="p"
              className="type-highlight"
              value={g.addressHeading}
            />
            <FormattedText
              as="h2"
              className="type-subheading"
              value={g.company}
            />
            <FormattedText as="p" className="type-body" value={g.address} />
          </div>
        </div>
        {c.map.confirmed ? (
          <>
            <iframe
              title={t(g.addressHeading)}
              src={`https://www.google.com/maps?q=${encodeURIComponent(coords)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <a
              className="button type-button"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedText value={c.directions} />
            </a>
          </>
        ) : (
          <div className="map-pending">
            <FormattedText as="p" className="type-body" value={c.mapPending} />
            {c.map.sourceUrl && (
              <a
                className="button type-button"
                href={c.map.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FormattedText value={c.directions} />
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
