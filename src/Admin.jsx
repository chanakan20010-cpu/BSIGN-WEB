import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "./api";
import { useSite, Site, Typography, Picture, Icon, iconNames } from "./shared";
const names = {
  global: "ส่วนกลาง / เมนู / บริษัท",
  home: "หน้าแรก",
  about: "เกี่ยวกับเรา",
  news: "ข่าวสาร / หมวดหมู่",
  contact: "ติดต่อเรา / ฟอร์ม / แผนที่",
  cta: "แบนเนอร์ติดต่อ",
  styles: "สไตล์ตัวอักษร",
  icons: "ไอคอน",
  articles: "จัดการบทความ",
  media: "รูปภาพและไฟล์",
  contacts: "ข้อความติดต่อ",
  subscribers: "ผู้สมัครรับข่าวสาร",
  password: "เปลี่ยนรหัสผ่าน",
};
const labels = {
  title: "หัวข้อ",
  intro: "ข้อความแนะนำ",
  hero: "รูปหลัก",
  cta: "ข้อความปุ่ม",
  ctaHref: "ลิงก์ปุ่ม",
  services: "บริการหลัก",
  cards: "การ์ด",
  why: "ทำไมต้องเลือกเรา",
  advantages: "จุดเด่น",
  team: "รูปทีมงาน",
  badge: "ข้อความป้าย",
  badgeTitle: "หัวข้อป้าย",
  heading: "หัวข้อ",
  eyebrow: "ข้อความเหนือหัวข้อ",
  description: "คำอธิบาย",
  body: "เนื้อหา",
  text: "ข้อความ",
  color: "สี",
  url: "URL รูป",
  alt: "คำอธิบายรูป",
  label: "ชื่อที่แสดง",
  href: "ลิงก์",
  brand: "ชื่อแบรนด์",
  company: "ชื่อบริษัท",
  logo: "โลโก้",
  favicon: "URL favicon",
  nav: "เมนู",
  email: "อีเมล",
  phone: "โทรศัพท์",
  address: "ที่อยู่",
  size: "ขนาด Desktop (px)",
  tablet: "ขนาด Tablet (px)",
  mobile: "ขนาด Mobile (px)",
  weight: "น้ำหนัก",
  spacing: "ระยะตัวอักษร (px)",
  line: "ระยะบรรทัด (ตัวคูณ)",
  font: "ฟอนต์",
  background: "สีพื้นหลัง",
  name: "ชื่อ",
  asset: "ไฟล์ไอคอน",
  mode: "โหมดแสดงผล",
  confirmed: "ยืนยันพิกัดแล้ว",
  latitude: "ละติจูด",
  longitude: "ลองจิจูด",
  sourceUrl: "ลิงก์หมุดที่ผู้ใช้ยืนยัน",
  map: "แผนที่",
  th: "ไทย",
  en: "English",
  status: "สถานะ",
  publishedAt: "วันเผยแพร่ ISO 8601",
  slug: "URL slug",
  category: "รหัสหมวดหมู่",
  gallery: "รูปภาพเพิ่มเติม",
  excerpt: "คำโปรย",
  image: "รูปข่าว",
  pageSize: "จำนวนข่าวต่อหน้า",
};
const clone = (v) => structuredClone(v);
function Field({ value, onChange, path = "", media = [] }) {
  const name = path.split(".").at(-1),
    label = labels[name] || name;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("url" in value && "alt" in value)
      return (
        <fieldset>
          <legend>{label}</legend>
          <Field
            path={path + ".url"}
            value={value.url}
            onChange={(v) => onChange({ ...value, url: v, crop: null })}
          />
          <label>
            เลือกจากคลัง
            <select
              value=""
              onChange={(e) =>
                e.target.value &&
                onChange({ ...value, url: e.target.value, crop: null })
              }
            >
              <option value="">เลือกไฟล์…</option>
              {media.map((m) => (
                <option key={m.id} value={m.url}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            path={path + ".alt"}
            value={value.alt}
            onChange={(v) => onChange({ ...value, alt: v })}
          />
          <Picture value={value} />
          {value.crop && <p>ใช้บริเวณภาพจากต้นแบบ เปลี่ยน URL แล้วจะใช้รูปใหม่เต็มภาพ</p>}
        </fieldset>
      );
    return (
      <fieldset>
        <legend>{label}</legend>
        {Object.entries(value).map(([k, v]) => (
          <Field
            key={k}
            path={path + "." + k}
            value={v}
            media={media}
            onChange={(x) => onChange({ ...value, [k]: x })}
          />
        ))}
      </fieldset>
    );
  }
  if (Array.isArray(value))
    return (
      <fieldset>
        <legend>{label}</legend>
        {value.map((v, i) => (
          <div className="array-item" key={i}>
            <Field
              path={path + "." + i}
              value={v}
              media={media}
              onChange={(x) => onChange(value.map((o, j) => (j === i ? x : o)))}
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              ลบรายการ {i + 1}
            </button>
            <button
              type="button"
              disabled={!i}
              onClick={() => {
                const a = [...value];
                [a[i - 1], a[i]] = [a[i], a[i - 1]];
                onChange(a);
              }}
            >
              ย้ายขึ้น
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...value,
              clone(
                value[0] ?? { url: "", alt: { th: "", en: "" }, crop: null },
              ),
            ])
          }
        >
          เพิ่มรายการ
        </button>
      </fieldset>
    );
  if (value === null) return null;
  if (typeof value === "boolean")
    return (
      <label className="check">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  const opts =
    name === "font"
      ? ["Noto Sans Thai", "Noto Sans", "sans-serif", "serif"]
      : name === "status"
        ? ["draft", "published"]
        : null;
  return (
    <label>
      {label}
      {opts ? (
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {opts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : typeof value === "number" ? (
        <input
          aria-label={label}
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      ) : name.toLowerCase().endsWith("color") || name === "background" ? (
        <input
          aria-label={label}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <textarea
          aria-label={label}
          rows={String(value).length > 100 ? 4 : 1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
const slots = [
  "section.marker",
  "home.services.marker",
  "home.why.marker",
  "news.section.marker",
  "about.vision.marker",
  "about.values.marker",
  "about.foot.0",
  "about.foot.1",
  "about.foot.2",
  "about.foot.3",
  "news.category",
  "news.latest",
  "news.search",
  "news.previous",
  "news.next",
  "header.menu",
  "footer.mail",
  "footer.phone",
  "footer.pin",
  "home.hero.arrow",
  "home.badge",
  ...Array.from({ length: 3 }, (_, i) => `home.service.${i}`),
  ...Array.from({ length: 3 }, (_, i) => `home.advantage.${i}`),
  "about.mission.0",
  "about.mission.1",
  ...Array.from({ length: 4 }, (_, i) => `about.value.${i}`),
  "cta.arrow",
  "news.card.arrow",
  "news.featured.arrow",
  "contact.mail",
  "contact.phone",
  "contact.clock",
  "contact.office",
  "contact.submit",
  "social.0",
  "social.1",
  "social.2",
];
function IconEditor({ value, onChange, media, defaults }) {
  const [scope, setScope] = useState("shared");
  const [key, setKey] = useState("arrow");
  const site = useSite();
  const slotBase = (slot) => {
    if (
      slot.includes("marker") ||
      slot.startsWith("about.foot.") ||
      ["news.category", "news.latest"].includes(slot)
    )
      return "marker";
    if (slot.startsWith("home.service.")) return "terminal";
    if (slot.startsWith("home.advantage.")) return "rocket";
    if (slot.startsWith("about.value."))
      return ["speed", "engineering", "heart", "brain"][
        Number(slot.split(".").at(-1)) % 4
      ];
    if (slot.startsWith("about.mission."))
      return Number(slot.split(".").at(-1)) ? "rocket" : "eye";
    if (slot.startsWith("social."))
      return (
        site.content.contact.socials[Number(slot.split(".").at(-1))]?.icon ||
        "arrow"
      );
    return (
      {
        "header.menu": "menu",
        "home.badge": "bolt",
        "contact.office": "building",
        "contact.submit": "arrow",
      }[slot] ||
      (Object.hasOwn(value.shared, slot.split(".").at(-1))
        ? slot.split(".").at(-1)
        : "arrow")
    );
  };
  const availableSlots = [
    ...new Set([
      ...slots,
      ...site.content.home.cards.map((_, i) => `home.service.${i}`),
      ...site.content.home.advantages.map((_, i) => `home.advantage.${i}`),
      ...site.content.about.cards.flatMap((_, i) => [
        `about.value.${i}`,
        `about.foot.${i}`,
      ]),
      ...site.content.about.missions.map((_, i) => `about.mission.${i}`),
      ...site.content.contact.socials.map((_, i) => `social.${i}`),
    ]),
  ];
  const v = value[scope][key] || clone(value.shared[slotBase(key)]);
  const update = (x) =>
    onChange({ ...value, [scope]: { ...value[scope], [key]: { ...v, ...x } } });
  return (
    <>
      <p>แบบใช้ร่วมกัน: เปลี่ยนทุกจุดที่อ้างอิงไอคอนนี้ • เฉพาะจุด: เปลี่ยนเฉพาะตำแหน่งที่เลือก</p>
      <label>
        ขอบเขต
        <select
          aria-label="ขอบเขต"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            setKey(e.target.value === "shared" ? "arrow" : "header.menu");
          }}
        >
          <option value="shared">ทุกตำแหน่งที่ใช้ร่วมกัน</option>
          <option value="overrides">เฉพาะจุด</option>
        </select>
      </label>
      <label>
        ตำแหน่ง
        <select
          aria-label="ตำแหน่ง"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        >
          {(scope === "shared"
            ? Object.keys(value.shared)
            : availableSlots
          ).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <label>
        คลังไอคอน
        <select
          aria-label="คลังไอคอน"
          value={v.name}
          onChange={(e) => update({ name: e.target.value, asset: "" })}
        >
          {iconNames.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <label>
        ไฟล์จากคลัง
        <select
          aria-label="ไฟล์จากคลัง"
          value={v.asset}
          onChange={(e) =>
            update({
              asset: e.target.value,
              mode: e.target.value.endsWith(".svg") ? "mask" : "image",
            })
          }
        >
          <option value="">ใช้ไอคอนสำเร็จรูป</option>
          {media.map((m) => (
            <option key={m.id} value={m.url}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        สีไอคอน (SVG / ไอคอนสำเร็จรูป)
        <input
          type="color"
          value={v.color}
          disabled={v.asset !== "" && !v.asset.endsWith(".svg")}
          onChange={(e) => update({ color: e.target.value })}
        />
      </label>
      <label>
        พื้นหลัง
        <input
          type="color"
          value={v.background}
          onChange={(e) => update({ background: e.target.value })}
        />
      </label>
      {v.asset.endsWith(".svg") && (
        <label>
          การแสดง SVG
          <select
            aria-label="การแสดง SVG"
            value={v.mode}
            onChange={(e) => update({ mode: e.target.value })}
          >
            <option value="mask">ใช้สีเดียวตามการตั้งค่า</option>
            <option value="image">ใช้สีต้นฉบับ</option>
          </select>
        </label>
      )}
      <p>
        ภาพ PNG/JPEG/WebP เปลี่ยนสีภายในไม่ได้ • ไอคอนของ Google Maps
        และเบราว์เซอร์อยู่นอกการควบคุม
      </p>
      <Site.Provider
        value={{ ...site, content: { ...site.content, icons: value } }}
      >
        <Icon
          name={scope === "shared" ? key : "arrow"}
          slot={scope === "overrides" ? key : "__preview"}
        />
      </Site.Provider>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            [scope]: {
              ...value[scope],
              [key]: scope === "shared" ? clone(defaults.shared[key]) : null,
            },
          })
        }
      >
        คืนค่าไอคอนนี้
      </button>
    </>
  );
}
export default function Admin() {
  const site = useSite();
  const [authenticated, setAuthenticated] = useState(false),
    [docs, setDocs] = useState(null),
    [defaults, setDefaults] = useState(null),
    [tab, setTab] = useState("home"),
    [draft, setDraft] = useState(null),
    [media, setMedia] = useState([]),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [list, setList] = useState([]),
    [article, setArticle] = useState(null),
    [search, setSearch] = useState("");
  const report = (e) =>
    setStatus(
      e.message === "REVISION_CONFLICT"
        ? "ข้อมูลมีการเปลี่ยนแปลงจากหน้าต่างอื่น กรุณาโหลดข้อมูลใหม่ก่อนแก้ไข (ข้อมูลในช่องยังอยู่)"
        : e.message === "INVALID_CREDENTIALS"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : e.message === "VALIDATION"
            ? "ข้อมูลไม่ถูกต้อง กรุณาตรวจช่องและรูปแบบข้อมูล"
            : "ไม่สำเร็จ: " + e.message,
    );
  async function load() {
    const [d, f, m] = await Promise.all([
      api("/admin/documents"),
      api("/admin/defaults"),
      api("/admin/media"),
    ]);
    setDocs(d);
    setDefaults(f);
    setMedia(m);
    setDraft(clone(d[tab]?.value));
  }
  useEffect(() => {
    api("/session").then((s) => setAuthenticated(s.authenticated));
  }, []);
  useEffect(() => {
    if (authenticated) load().catch(report);
  }, [authenticated]);
  useEffect(() => {
    setStatus("");
    setArticle(null);
    if (docs?.[tab]) setDraft(clone(docs[tab].value));
    if (authenticated && ["articles", "contacts", "subscribers"].includes(tab))
      api("/admin/" + tab)
        .then(setList)
        .catch(report);
  }, [tab, authenticated]);
  async function save() {
    setBusy(true);
    try {
      const saved = await api("/admin/documents/" + tab, {
        method: "PATCH",
        body: { revision: docs[tab].revision, patch: draft },
      });
      setDocs({ ...docs, [tab]: saved });
      site.setContent({ ...site.content, [tab]: saved.value });
      setStatus("บันทึกแล้ว");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  if (!authenticated)
    return (
      <main className="admin login">
        <h1>BSIGN TECH · ผู้ดูแลระบบ</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("/login", {
                method: "POST",
                body: Object.fromEntries(new FormData(e.currentTarget)),
              });
              setAuthenticated(true);
            } catch (e) {
              report(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            อีเมล
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            รหัสผ่าน
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button disabled={busy}>เข้าสู่ระบบ</button>
        </form>
        <p role="status">{status}</p>
        <p>หากยังไม่มีบัญชี กด “จัดการเนื้อหา” ในหน้าต่างเปิดพรีวิวเพื่อตั้งบัญชีครั้งแรก</p>
        <Link to="/">กลับเว็บไซต์</Link>
      </main>
    );
  return (
    <div className="admin">
      <div className="admin-top">
        <h1>BSIGN TECH · CMS</h1>
        <Link to="/" target="_blank">
          เปิดเว็บไซต์
        </Link>
        <button
          onClick={async () => {
            await api("/logout", { method: "POST" });
            await api("/session");
            setAuthenticated(false);
          }}
        >
          ออกจากระบบ
        </button>
      </div>
      <div className="admin-layout">
        <aside>
          <label>
            ค้นหาหมวด
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {Object.entries(names)
            .filter(([k, v]) =>
              (k + v).toLowerCase().includes(search.toLowerCase()),
            )
            .map(([k, v]) => (
              <button
                aria-current={tab === k ? "page" : undefined}
                key={k}
                onClick={() => {
                  if (
                    docs?.[tab] &&
                    JSON.stringify(draft) !== JSON.stringify(docs[tab].value) &&
                    !confirm("มีการแก้ไขที่ยังไม่บันทึก ต้องการออกจากหมวดนี้หรือไม่?")
                  )
                    return;
                  setDraft(null);
                  setTab(k);
                }}
              >
                {v}
              </button>
            ))}
        </aside>
        <main>
          <h2>{names[tab]}</h2>
          <p role="status" className="admin-status">
            {status}
          </p>
          {docs?.[tab] && draft && (
            <>
              <div className="admin-actions">
                <button disabled={busy} onClick={save}>
                  บันทึกการเปลี่ยนแปลง
                </button>
                <button onClick={() => setDraft(clone(defaults[tab]))}>
                  คืนค่าเริ่มต้น (ดูตัวอย่างก่อนบันทึก)
                </button>
                <button
                  onClick={() =>
                    load()
                      .then(() => setStatus("โหลดข้อมูลใหม่แล้ว"))
                      .catch(report)
                  }
                >
                  โหลดข้อมูลใหม่
                </button>
              </div>
              {tab === "styles" ? (
                <>
                  {Object.entries(draft).map(([k, v]) => (
                    <section className="style-editor" key={k}>
                      <Field
                        path={k}
                        value={v}
                        onChange={(x) => setDraft({ ...draft, [k]: x })}
                      />
                      <Typography styles={draft}>
                        <div
                          className={"style-preview type-" + k}
                          style={{
                            background: ["inverse", "footer"].includes(k)
                              ? "#000"
                              : "#fff",
                          }}
                        >
                          ตัวอย่างภาษาไทย — BSIGN TECH
                          <br />
                          Digital architecture & intelligent engineering
                        </div>
                      </Typography>
                    </section>
                  ))}
                </>
              ) : tab === "icons" ? (
                <IconEditor
                  value={draft}
                  onChange={setDraft}
                  media={media}
                  defaults={defaults.icons}
                />
              ) : (
                <Field
                  path={tab}
                  value={draft}
                  onChange={setDraft}
                  media={media}
                />
              )}
            </>
          )}
          {tab === "media" && (
            <>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  try {
                    await api("/admin/media", {
                      method: "POST",
                      body: new FormData(f),
                    });
                    setMedia(await api("/admin/media"));
                    f.reset();
                    setStatus("อัปโหลดแล้ว");
                  } catch (e) {
                    report(e);
                  }
                }}
              >
                <label>
                  SVG / PNG / JPEG / WebP (ไม่เกิน 8 MB)
                  <input
                    name="file"
                    type="file"
                    accept="image/svg+xml,image/png,image/jpeg,image/webp"
                    required
                  />
                </label>
                <label>
                  แหล่งที่มา / URL
                  <input name="source" required />
                </label>
                <label>
                  สิทธิ์การใช้งาน / เจ้าของ
                  <input name="license" required />
                </label>
                <button>อัปโหลดและตรวจไฟล์</button>
              </form>
              <div className="media-list">
                {media.map((m) => (
                  <figure key={m.id}>
                    <img src={m.url} alt={m.name} />
                    <figcaption>
                      {m.name}
                      <input aria-label="URL" readOnly value={m.url} />
                      {m.source} · {m.license}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
          {tab === "articles" && (
            <>
              <button
                onClick={() =>
                  setArticle({
                    slug: "",
                    title: { th: "", en: "" },
                    excerpt: { th: "", en: "" },
                    body: { th: "", en: "" },
                    category: docs.news.value.categories[0].id,
                    status: "draft",
                    publishedAt: new Date().toISOString(),
                    image: { url: "", alt: { th: "", en: "" }, crop: null },
                    gallery: [],
                  })
                }
              >
                เพิ่มบทความ
              </button>
              {article ? (
                <>
                  <Field
                    path="บทความ"
                    value={Object.fromEntries(
                      Object.entries(article).filter(
                        ([k]) => !["id", "revision"].includes(k),
                      ),
                    )}
                    onChange={(x) => setArticle({ ...article, ...x })}
                    media={media}
                  />
                  <button
                    onClick={async () => {
                      try {
                        await api(
                          "/admin/articles" +
                            (article.id ? "/" + article.id : ""),
                          {
                            method: article.id ? "PATCH" : "POST",
                            body: article.id
                              ? {
                                  revision: article.revision,
                                  patch: Object.fromEntries(
                                    Object.entries(article).filter(
                                      ([k]) => !["id", "revision"].includes(k),
                                    ),
                                  ),
                                }
                              : article,
                          },
                        );
                        setList(await api("/admin/articles"));
                        setArticle(null);
                        setStatus("บันทึกบทความแล้ว");
                      } catch (e) {
                        report(e);
                      }
                    }}
                  >
                    บันทึกบทความ
                  </button>
                  <button onClick={() => setArticle(null)}>กลับรายการ</button>
                </>
              ) : (
                list.map((a) => (
                  <article className="admin-list-item" key={a.id}>
                    <strong>{a.title.th}</strong>
                    <span>
                      {a.status} · {a.publishedAt}
                    </span>
                    <button onClick={() => setArticle(clone(a))}>แก้ไข</button>
                    <button
                      onClick={async () => {
                        if (!confirm("ลบบทความนี้?")) return;
                        try {
                          await api("/admin/articles/" + a.id, {
                            method: "DELETE",
                            body: { revision: a.revision },
                          });
                          setList(await api("/admin/articles"));
                        } catch (e) {
                          report(e);
                        }
                      }}
                    >
                      ลบ
                    </button>
                  </article>
                ))
              )}
            </>
          )}
          {tab === "contacts" &&
            list.map((c) => (
              <article className="admin-list-item" key={c.id}>
                <strong>
                  {c.value.name} · {c.value.email}
                </strong>
                <p>
                  {c.value.company} · {c.value.phone}
                </p>
                <p className="prose">{c.value.message}</p>
                <small>
                  {c.created_at} · อีเมล: {c.mail_status}
                </small>
                <label>
                  สถานะ
                  <select
                    value={c.status}
                    onChange={async (e) => {
                      try {
                        await api("/admin/contacts/" + c.id, {
                          method: "PATCH",
                          body: { status: e.target.value },
                        });
                        setList(await api("/admin/contacts"));
                      } catch (e) {
                        report(e);
                      }
                    }}
                  >
                    {["new", "read", "resolved"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={async () => {
                    if (confirm("ลบข้อมูลติดต่ออย่างถาวร?")) {
                      await api("/admin/contacts/" + c.id, {
                        method: "DELETE",
                      });
                      setList(await api("/admin/contacts"));
                    }
                  }}
                >
                  ลบข้อมูลส่วนบุคคล
                </button>
              </article>
            ))}
          {tab === "subscribers" && (
            <>
              <p>
                ต้นแบบไม่มีฟอร์มสมัครรับข่าวสาร จึงไม่เพิ่มฟอร์มบนเว็บไซต์ API
                รับข้อมูลและหน้าจัดการพร้อมใช้งาน แต่ยังไม่มีระบบส่งแคมเปญ
              </p>
              {list.map((s) => (
                <article className="admin-list-item" key={s.id}>
                  {s.email} · {s.created_at}
                  <button
                    onClick={async () => {
                      if (confirm("ลบผู้สมัครนี้?")) {
                        await api("/admin/subscribers/" + s.id, {
                          method: "DELETE",
                        });
                        setList(await api("/admin/subscribers"));
                      }
                    }}
                  >
                    ลบ
                  </button>
                </article>
              ))}
            </>
          )}
          {tab === "password" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("/password", {
                    method: "POST",
                    body: Object.fromEntries(new FormData(e.currentTarget)),
                  });
                  setAuthenticated(false);
                  await api("/session");
                  setStatus("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่");
                } catch (e) {
                  report(e);
                }
              }}
            >
              <label>
                รหัสผ่านปัจจุบัน
                <input
                  type="password"
                  name="current"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                รหัสผ่านใหม่ (12 ตัวอักษรขึ้นไป)
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={200}
                  required
                />
              </label>
              <button>เปลี่ยนรหัสผ่านและออกจากทุก session</button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
