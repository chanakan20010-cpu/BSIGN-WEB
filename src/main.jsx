import React, { useState, useEffect } from "react";
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
} from "./shared";
import Admin from "./Admin";
import Setup from "./Setup";
import "./style.css";
function App() {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(false);
  const [lang, setLang] = useState(
    localStorage.getItem("bsign-lang") === "en" ? "en" : "th",
  );
  const location = useLocation();
  useEffect(() => {
    api("/content")
      .then(setContent)
      .catch(() => setError(true));
    if (location.pathname !== "/setup") api("/session").catch(() => {});
  }, []);
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
      <Typography styles={content.styles}>
        {location.pathname === "/setup" ? (
          <Setup />
        ) : location.pathname.startsWith("/admin") ? (
          <Admin />
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
                      <h1 className="type-hero">
                        {t(content.global.privacyLabel)}
                      </h1>
                      <p className="type-body prose">
                        {t(content.global.privacy)}
                      </p>
                    </div>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="container section">
                      <h1 className="type-hero">
                        {t(content.global.notFound)}
                      </h1>
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
        {t(g.skip)}
      </a>
      <header>
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label={t(g.brand)}>
            <Picture value={g.logo} />
            <strong className="type-brand">
              <em>{t(g.brand).split(" ")[0]}</em>{" "}
              {t(g.brand).split(" ").slice(1).join(" ")}
            </strong>
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
                {t(n.label)}
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
  return (
    <footer>
      <div className="container footer-grid">
        <div className="footer-brand">
          <Picture value={g.footerLogo || g.logo} />
          <div>
            <strong className="type-footer">{t(g.brand)}</strong>
            <p className="type-footer">{t(g.company)}</p>
          </div>
        </div>
        <nav>
          {g.nav.map((n, i) => (
            <NavLink
              className="type-footer"
              key={i}
              to={n.href}
              end={n.href === "/"}
            >
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        <div>
          <h3 className="footer-label type-subheading">
            {t(g.contactHeading)}
          </h3>
          <a className="type-footer contact-line" href={"mailto:" + g.email}>
            <Icon name="mail" slot="footer.mail" />
            {g.email}
          </a>
          <a className="type-footer contact-line" href={"tel:" + g.phone}>
            <Icon name="phone" slot="footer.phone" />
            {g.phone}
          </a>
        </div>
        <div>
          <h3 className="footer-label type-subheading">
            {t(g.addressHeading)}
          </h3>
          <div className="contact-line">
            <Icon name="pin" slot="footer.pin" />
            <p className="type-footer">{t(g.address)}</p>
          </div>
        </div>
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
        <div className="type-highlight">{t(c.eyebrow)}</div>
        <Titles as="h2" lines={c.title} />
        <p className="type-inverse">{t(c.body)}</p>
      </div>
      <div className="cta-actions">
        <Link className="button type-button" to={c.primaryHref}>
          {t(c.primary)}
          <Icon name="arrow" slot="cta.arrow" />
        </Link>
        <Link className="button secondary type-button" to={c.secondaryHref}>
          {t(c.secondary)}
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
            <p className="type-intro">{t(h.intro)}</p>
            <Link className="button type-button" to={h.ctaHref}>
              {t(h.cta)}
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
                <Icon name="terminal" slot={`home.service.${i}`} />
                <p className="type-highlight">{t(c.eyebrow)}</p>
                <h3 className="type-subheading">{t(c.title)}</h3>
                <p className="type-body">{t(c.body)}</p>
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
              <div className="type-highlight">{t(h.badge)}</div>
              <strong className="type-subheading">{t(h.badgeTitle)}</strong>
            </div>
            <Icon name="bolt" slot="home.badge" />
          </div>
        </div>
        <div>
          <SectionHeading value={h.why} slot="home.why.marker" />
          <div className="advantages">
            {h.advantages.map((a, i) => (
              <article key={i}>
                <Icon name="rocket" slot={`home.advantage.${i}`} />
                <div>
                  <h3 className="type-subheading">{t(a.title)}</h3>
                  <p className="type-body">{t(a.body)}</p>
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
          <p className="type-intro">{t(a.intro)}</p>
        </div>
        <div className="matrix card">
          <div className="matrix-caption type-highlight">
            <span>{t(a.matrix)}</span>
            <span>{t(a.version)}</span>
          </div>
          <Picture value={a.hero} />
          <div className="method">
            <p className="type-highlight">{t(a.method)}</p>
            <strong className="type-subheading">{t(a.methodTitle)}</strong>
          </div>
          <div className="stats">
            {a.stats.map((s, i) => (
              <div key={i}>
                <strong className="type-heading">{t(s.value)}</strong>
                <p className="type-body">{t(s.label)}</p>
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
                <Icon name={i ? "rocket" : "eye"} slot={`about.mission.${i}`} />
                {t(m.title)}
              </h3>
              <blockquote className="type-highlight">
                “ {t(m.quote)} ”
              </blockquote>
              <p className="type-body">{t(m.body)}</p>
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
                />
                <span className="type-highlight">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="type-subheading">{t(c.title)}</h3>
              <p className="type-highlight">{t(c.highlight)}</p>
              <p className="type-body">{t(c.body)}</p>
              <p className="type-body value-foot">
                <Icon name="marker" slot={`about.foot.${i}`} />
                {t(c.foot)}
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
      <Link to={"/news/" + a.slug} tabIndex={-1} aria-hidden="true">
        <Picture value={a.image} />
      </Link>
      <div className="news-card-body">
        <span className="category type-highlight">
          <Icon name="marker" slot="news.category" />
          {t(n.categories.find((c) => c.id === a.category)?.label)}
        </span>
        <h3 className="type-subheading">
          <Link to={"/news/" + a.slug}>{t(a.title)}</Link>
        </h3>
        <p className="type-body excerpt">{t(a.excerpt)}</p>
        <div className="card-bottom">
          <time className="type-body" dateTime={a.publishedAt}>
            {new Date(a.publishedAt).toLocaleDateString(
              lang === "th" ? "th-TH-u-ca-gregory" : "en-GB",
              { day: "2-digit", month: "short", year: "numeric" },
            )}
          </time>
          <Link className="type-menu" to={"/news/" + a.slug}>
            {t(g.readMore)}
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
    <div className="cards three">
      {items ? (
        items.map((a) => <NewsCard a={a} key={a.id} />)
      ) : (
        <p role="status" className="type-body">
          {t(failed ? g.error : g.loading)}
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
                {t(c.label)}
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
              {t(g.search)}
            </label>
            <Icon name="search" slot="news.search" />
            <input
              id="news-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="button type-button">{t(g.search)}</button>
          </form>
        </div>
        {error ? (
          <p role="alert">{t(g.error)}</p>
        ) : !data ? (
          <p role="status">{t(g.loading)}</p>
        ) : (
          <>
            {page === 1 && !category && !params.get("q") && data.items[0] && (
              <article className="featured card">
                <Picture value={data.items[0].image} />
                <div>
                  <span className="category type-highlight">
                    <Icon name="marker" slot="news.latest" />
                    {t(n.latest)}
                  </span>
                  <h2 className="type-heading">{t(data.items[0].title)}</h2>
                  <p className="type-body">{t(data.items[0].excerpt)}</p>
                  <Link
                    className="button type-button"
                    to={"/news/" + data.items[0].slug}
                  >
                    {t(g.readMore)}
                    <Icon name="arrow" slot="news.featured.arrow" />
                  </Link>
                </div>
              </article>
            )}
            <SectionHeading value={n.section} slot="news.section.marker" />
            <div className="cards three">
              {data.items
                .filter(
                  (a, i) =>
                    !(i === 0 && page === 1 && !category && !params.get("q")),
                )
                .map((a) => (
                  <NewsCard key={a.id} a={a} />
                ))}
            </div>
            {!data.total && <p role="status">{t(g.empty)}</p>}
            <nav className="pagination" aria-label={t(n.section.heading)}>
              <button
                disabled={page <= 1}
                onClick={() => filter({ page: String(page - 1) })}
              >
                <Icon name="previous" slot="news.previous" />
                {t(g.previous)}
              </button>
              <span>
                {page} / {Math.max(1, data.pages)}
              </span>
              <button
                disabled={page >= data.pages}
                onClick={() => filter({ page: String(page + 1) })}
              >
                {t(g.next)}
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
              <Picture value={a.heroImage || a.image} />
              <h1
                className="type-heading"
                style={{ color: n.articleTitleColor }}
              >
                {t(a.title)}
              </h1>
            </div>
            <div className="article-body">
              <p className="type-subheading">{t(a.lead || a.excerpt)}</p>
              <div className="prose type-body">{t(a.body)}</div>
              {a.secondaryBody && (
                <div className="article-split">
                  <Picture value={a.inlineImage} />
                  <div className="prose type-body">{t(a.secondaryBody)}</div>
                </div>
              )}
              {a.gallery.length > 0 && (
                <>
                  <h2 className="type-heading">{t(n.gallery)}</h2>
                  <div className="cards three">
                    {a.gallery.map((v, i) => (
                      <Picture value={v} key={i} />
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
          {t(
            error ? (error === "NOT_FOUND" ? g.notFound : g.error) : g.loading,
          )}
        </p>
      )}
      <Link className="type-menu" to="/news">
        {t(g.back)}
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
        <h2 className="type-heading">{t(c.subtitle)}</h2>
      </div>
      <div className="contact-grid">
        <div>
          <section className="card contact-info">
            <h2 className="outlined type-heading">{t(c.heading)}</h2>
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
                  {t(c.hours)}
                  <small className="type-body">{t(c.closed)}</small>
                </>,
              ],
            ].map(([icon, label, value]) => (
              <div className="contact-line" key={icon}>
                <Icon name={icon} slot={"contact." + icon} />
                <div>
                  <div className="type-highlight">{t(label)}</div>
                  <div className="type-intro">{value}</div>
                </div>
              </div>
            ))}
          </section>
          <section className="card social">
            <h2 className="type-subheading">{t(c.socialHeading)}</h2>
            <div>
              {c.socials.map((s, i) => {
                const inner = (
                  <>
                    <Icon name={s.icon} slot={"social." + i} />
                    <strong className="type-label">{t(s.name)}</strong>
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
          <h2 className="outlined type-heading">{t(c.formHeading)}</h2>
          <form onSubmit={submit}>
            <div className="form-grid">
              {Object.entries(c.fields).map(([key, f]) => (
                <label key={key} className={"type-label field-" + key}>
                  {t(f.label)}
                  {["name", "email", "message"].includes(key) && " *"}
                  {key === "message" ? (
                    <textarea
                      className="type-body"
                      name={key}
                      required
                      minLength={5}
                      maxLength={5000}
                      placeholder={t(f.placeholder)}
                    />
                  ) : (
                    <input
                      className="type-body"
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
              {t(c.consent)} <Link to="/privacy">{t(g.privacyLabel)}</Link>
            </label>
            <button
              disabled={state === "pending"}
              className="button type-button"
            >
              {t(state === "pending" ? c.pending : c.submit)}
              <Icon name="arrow" slot="contact.submit" />
            </button>
            <p role="status" className="type-body">
              {state === "success"
                ? t(c.success)
                : state === "error"
                  ? t(g.error)
                  : ""}
            </p>
          </form>
        </section>
      </div>
      <section className="card office">
        <div className="contact-line">
          <Icon name="building" slot="contact.office" />
          <div>
            <p className="type-highlight">{t(g.addressHeading)}</p>
            <h2 className="type-subheading">{t(g.company)}</h2>
            <p className="type-body">{t(g.address)}</p>
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
              {t(c.directions)}
            </a>
          </>
        ) : (
          <div className="map-pending">
            <p className="type-body">{t(c.mapPending)}</p>
            {c.map.sourceUrl && (
              <a
                className="button type-button"
                href={c.map.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(c.directions)}
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
