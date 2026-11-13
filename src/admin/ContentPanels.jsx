import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Inbox,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { api } from "../api";
import { Picture } from "../shared";
import { Field } from "./Editors";

const copy = (v) => structuredClone(v);
const date = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "ยังไม่ระบุวันที่"
    : new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
};
const errors = {
  REVISION_CONFLICT:
    "บทความนี้มีการแก้ไขจากหน้าต่างอื่น ข้อมูลที่คุณแก้ยังอยู่ กรุณาตรวจบทความล่าสุดก่อนบันทึกอีกครั้ง",
  DUPLICATE_SLUG: "ลิงก์บทความนี้ถูกใช้แล้ว กรุณาเปลี่ยนลิงก์ให้ไม่ซ้ำ",
  INVALID_CREDENTIALS: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  INVALID_PASSWORD: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
  VALIDATION: "กรุณาตรวจข้อมูลในแบบฟอร์มให้ครบและอยู่ในรูปแบบที่ถูกต้อง",
  RATE_LIMIT: "คุณทำรายการหลายครั้งในช่วงสั้น ๆ กรุณารอสักครู่แล้วลองใหม่",
  UNAUTHORIZED: "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
  FILE_TOO_LARGE: "ไฟล์มีขนาดเกิน 8 MB กรุณาเลือกไฟล์ที่เล็กลง",
  LIMIT_FILE_SIZE: "ไฟล์มีขนาดเกิน 8 MB กรุณาเลือกไฟล์ที่เล็กลง",
  INVALID_IMAGE: "รูปภาพไม่ถูกต้อง กรุณาเลือก SVG, PNG, JPEG หรือ WebP",
  INVALID_SVG: "ไม่สามารถอ่านไฟล์ SVG นี้ได้ กรุณาตรวจไฟล์แล้วลองใหม่",
  UNSAFE_SVG: "ไฟล์ SVG มีส่วนประกอบที่ไม่รองรับ กรุณาเลือกไฟล์อื่น",
};
const errorText = (e) => errors[e?.message] || "ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง";
function useCollection(endpoint) {
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const mounted = useRef(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await api(endpoint);
      if (mounted.current) setItems(data);
      return data;
    } catch (e) {
      if (mounted.current) setError(true);
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [endpoint]);
  useEffect(() => {
    mounted.current = true;
    reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);
  return { items, loading, error, reload };
}
function Empty({
  icon: Icon = Search,
  title = "ไม่พบรายการที่ตรงกัน",
  description = "ลองเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูรายการอื่น",
  onReset,
}) {
  return (
    <div className="cms-empty">
      <Icon size={34} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {onReset && (
        <button className="cms-secondary" onClick={onReset}>
          ล้างตัวกรอง
        </button>
      )}
    </div>
  );
}
function CollectionState({ loading, error, onRetry }) {
  if (loading)
    return (
      <div className="cms-empty" role="status">
        <LoaderCircle size={28} className="cms-spin" aria-hidden="true" />
        <p>กำลังโหลดข้อมูล…</p>
      </div>
    );
  if (error)
    return (
      <div className="cms-empty" role="alert">
        <h3>ยังโหลดข้อมูลไม่ได้</h3>
        <p>ตรวจการเชื่อมต่อแล้วลองใหม่อีกครั้ง</p>
        <button className="cms-secondary" onClick={onRetry}>
          <RefreshCw size={16} />
          ลองใหม่
        </button>
      </div>
    );
  return null;
}
function Pagination({ page, setPage, total, size = 8, noun = "รายการ" }) {
  const pages = Math.max(1, Math.ceil(total / size)),
    current = Math.min(page, pages);
  return (
    <div className="cms-pagination">
      <p>
        {total
          ? `${(current - 1) * size + 1}–${Math.min(current * size, total)}`
          : 0}{" "}
        จาก {total} {noun}
      </p>
      <div className="cms-row-actions">
        <button
          className="cms-secondary"
          aria-label="หน้าก่อนหน้า"
          disabled={current <= 1}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span aria-live="polite">
          หน้า {current} / {pages}
        </span>
        <button
          className="cms-secondary"
          aria-label="หน้าถัดไป"
          disabled={current >= pages}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
function SearchField({ label, value, onChange, placeholder = "พิมพ์เพื่อค้นหา…" }) {
  return (
    <label className="cms-search-field">
      <span className="cms-muted">{label}</span>
      <span className="cms-search-control">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}
const effectiveStatus = (a) =>
  a.status === "draft"
    ? "draft"
    : new Date(a.publishedAt).getTime() > Date.now()
      ? "scheduled"
      : "published";
const statusNames = {
  draft: "ฉบับร่าง",
  published: "เผยแพร่แล้ว",
  scheduled: "ตั้งเวลาเผยแพร่",
};
const statusTone = {
  draft: "neutral",
  published: "success",
  scheduled: "warning",
};
const imageEmpty = () => ({ url: "", alt: { th: "", en: "" }, crop: null });
const newArticle = (category) => ({
  slug: "",
  title: { th: "", en: "" },
  excerpt: { th: "", en: "" },
  body: { th: "", en: "" },
  category,
  status: "draft",
  publishedAt: new Date().toISOString(),
  image: imageEmpty(),
  gallery: [],
});
function localDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function ArticlesPanel({
  categories = [],
  media = [],
  onNotice,
  onChanged,
  onDirtyChange,
}) {
  const { items, loading, error, reload } = useCollection("/admin/articles");
  const [article, setArticle] = useState(null),
    [baseline, setBaseline] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false);
  const dirty = !!article && JSON.stringify(article) !== baseline;
  const onDirtyRef = useRef(onDirtyChange);
  onDirtyRef.current = onDirtyChange;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyRef.current?.(false), []);
  useEffect(() => {
    setPage(1);
  }, [query, filter, category]);
  function openArticle(a) {
    const next = copy(a);
    setArticle(next);
    setBaseline(JSON.stringify(next));
  }
  function back() {
    if (dirty && !confirm("มีการแก้ไขบทความที่ยังไม่บันทึก ต้องการกลับรายการหรือไม่?"))
      return;
    setArticle(null);
  }
  async function save(e) {
    e.preventDefault();
    if (!/^[a-z0-9-]{1,150}$/.test(article.slug)) {
      onNotice?.("ลิงก์บทความใช้ตัวอักษร a–z ตัวเลข และขีดกลางเท่านั้น", "error");
      return;
    }
    if (!article.title.th.trim()) {
      onNotice?.("กรุณาใส่ชื่อบทความภาษาไทย", "error");
      return;
    }
    setBusy(true);
    try {
      const fields = Object.fromEntries(
        Object.entries(article).filter(
          ([k]) => !["id", "revision"].includes(k),
        ),
      );
      await api("/admin/articles" + (article.id ? "/" + article.id : ""), {
        method: article.id ? "PATCH" : "POST",
        body: article.id
          ? { revision: article.revision, patch: fields }
          : fields,
      });
      setArticle(null);
      onDirtyChange?.(false);
      await reload();
      onChanged?.();
      onNotice?.("บันทึกบทความแล้ว", "success");
    } catch (e) {
      onNotice?.(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  async function remove(a) {
    if (!confirm(`ลบบทความ “${a.title.th || a.slug}” อย่างถาวร?`)) return;
    setBusy(true);
    try {
      await api("/admin/articles/" + a.id, {
        method: "DELETE",
        body: { revision: a.revision },
      });
      await reload();
      onChanged?.();
      onNotice?.("ลบบทความแล้ว", "success");
    } catch (e) {
      onNotice?.(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  if (article) {
    const update = (key, value) => setArticle((a) => ({ ...a, [key]: value }));
    const extras = Object.keys(article).filter(
      (k) =>
        ![
          "id",
          "revision",
          "slug",
          "title",
          "excerpt",
          "body",
          "category",
          "status",
          "publishedAt",
          "image",
          "gallery",
        ].includes(k),
    );
    return (
      <form className="cms-article-form" onSubmit={save}>
        <div className="cms-toolbar">
          <button
            type="button"
            className="cms-secondary"
            onClick={back}
            disabled={busy}
          >
            <ArrowLeft size={16} />
            กลับรายการ
          </button>
          <span className="cms-badge" data-tone={dirty ? "warning" : "neutral"}>
            {dirty
              ? "มีการแก้ไขที่ยังไม่บันทึก"
              : article.id
                ? "แก้ไขบทความ"
                : "บทความใหม่"}
          </span>
        </div>
        <div className="cms-editor-layout">
          <div className="cms-article-content">
            <section className="cms-card">
              <div className="cms-card-header">
                <div>
                  <h3>เนื้อหาบทความ</h3>
                  <p>เรียบเรียงเรื่องราวสำหรับผู้อ่านภาษาไทยและภาษาอังกฤษ</p>
                </div>
              </div>
              <div className="cms-card-body">
                <Field
                  path="articles.title"
                  value={article.title}
                  onChange={(v) => update("title", v)}
                />
                <Field
                  path="articles.excerpt"
                  value={article.excerpt}
                  onChange={(v) => update("excerpt", v)}
                />
                <Field
                  path="articles.body"
                  value={article.body}
                  onChange={(v) => update("body", v)}
                />
              </div>
            </section>
            <section className="cms-card">
              <div className="cms-card-header">
                <div>
                  <h3>รูปภาพบทความ</h3>
                  <p>เลือกรูปหน้าปกและคำอธิบายเพื่อให้เข้าถึงเนื้อหาได้ครบถ้วน</p>
                </div>
              </div>
              <div className="cms-card-body">
                <Field
                  path="articles.image"
                  value={article.image}
                  media={media}
                  onChange={(v) => update("image", v)}
                />
                <Field
                  path="articles.gallery"
                  value={article.gallery}
                  media={media}
                  onChange={(v) => update("gallery", v)}
                />
              </div>
            </section>
            {extras.length > 0 && (
              <section className="cms-card">
                <div className="cms-card-header">
                  <h3>เนื้อหาและรูปภาพเพิ่มเติม</h3>
                </div>
                <div className="cms-card-body">
                  {extras.map((k) =>
                    article[k] === null &&
                    ["heroImage", "inlineImage"].includes(k) ? (
                      <button
                        key={k}
                        type="button"
                        className="cms-secondary"
                        onClick={() => update(k, imageEmpty())}
                      >
                        <ImagePlus size={16} />
                        เพิ่ม{k === "heroImage" ? "ภาพส่วนหัวบทความ" : "ภาพในเนื้อหา"}
                      </button>
                    ) : (
                      <Field
                        key={k}
                        path={"articles." + k}
                        value={article[k]}
                        media={media}
                        onChange={(v) => update(k, v)}
                      />
                    ),
                  )}
                </div>
              </section>
            )}
          </div>
          <aside className="cms-article-settings cms-card">
            <div className="cms-card-header">
              <h3>ตั้งค่าการเผยแพร่</h3>
            </div>
            <div className="cms-card-body">
              <label>
                ลิงก์บทความ
                <input
                  name="slug"
                  value={article.slug}
                  onChange={(e) => update("slug", e.target.value)}
                  pattern="[a-z0-9-]+"
                  maxLength={150}
                  required
                  placeholder="company-news"
                />
                <small className="cms-muted">
                  /news/{article.slug || "ชื่อบทความ"} · ใช้ a–z, 0–9 และ -
                </small>
              </label>
              <label>
                หมวดหมู่บทความ
                <select
                  name="category"
                  value={article.category}
                  onChange={(e) => update("category", e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label.th || c.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                สถานะบทความ
                <select
                  name="status"
                  value={article.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option value="draft">ฉบับร่าง</option>
                  <option value="published">เผยแพร่</option>
                </select>
              </label>
              <label>
                วันและเวลาเผยแพร่
                <input
                  type="datetime-local"
                  name="publishedAt"
                  value={localDate(article.publishedAt)}
                  required
                  onChange={(e) =>
                    update(
                      "publishedAt",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : "",
                    )
                  }
                />
                <small className="cms-muted">
                  ใช้เวลาท้องถิ่นของเครื่อง หากเลือกเวลาในอนาคต บทความจะปรากฏเมื่อถึงกำหนด
                </small>
              </label>
              <span
                className="cms-badge"
                data-tone={statusTone[effectiveStatus(article)]}
              >
                {statusNames[effectiveStatus(article)]}
              </span>
              <button className="cms-primary" type="submit" disabled={busy}>
                <Save size={16} />
                {busy ? "กำลังบันทึก…" : "บันทึกบทความ"}
              </button>
              {article.id && (
                <a
                  className="cms-secondary"
                  href={"/news/" + article.slug}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Eye size={16} />
                  ดูหน้าบทความ
                </a>
              )}
              <p className="cms-muted">
                ฉบับร่างและบทความที่ยังไม่ถึงเวลาเผยแพร่จะไม่แสดงบนเว็บไซต์
              </p>
            </div>
          </aside>
        </div>
      </form>
    );
  }
  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (a) =>
      (!category || a.category === category) &&
      (filter === "all" || effectiveStatus(a) === filter) &&
      [a.title.th, a.title.en, a.slug].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8))),
    visible = filtered.slice((current - 1) * 8, current * 8);
  const reset = () => {
    setQuery("");
    setFilter("all");
    setCategory("");
  };
  return (
    <>
      <div className="cms-toolbar">
        <p className="cms-muted">{items.length} บทความในคลังเนื้อหา</p>
        <div className="cms-row-actions">
          <button className="cms-secondary" onClick={reload} disabled={loading}>
            <RefreshCw size={16} />
            รีเฟรช
          </button>
          <button
            className="cms-primary"
            disabled={!categories.length}
            onClick={() => openArticle(newArticle(categories[0]?.id || ""))}
          >
            <Plus size={17} />
            เพิ่มบทความ
          </button>
        </div>
      </div>
      <section className="cms-card">
        <div className="cms-card-body cms-list-tools">
          <div className="cms-filter-tabs" aria-label="สถานะบทความ">
            {[
              ["all", "ทั้งหมด"],
              ["published", "เผยแพร่แล้ว"],
              ["draft", "ฉบับร่าง"],
              ["scheduled", "ตั้งเวลา"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? "cms-primary" : "cms-secondary"}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
                <span>
                  {key === "all"
                    ? items.length
                    : items.filter((a) => effectiveStatus(a) === key).length}
                </span>
              </button>
            ))}
          </div>
          <div className="cms-field-grid">
            <SearchField
              label="ค้นหาบทความ"
              value={query}
              onChange={setQuery}
              placeholder="ชื่อบทความหรือลิงก์"
            />
            <label>
              กรองหมวดหมู่
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">ทุกหมวดหมู่</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label.th || c.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <CollectionState loading={loading} error={error} onRetry={reload} />
        {!loading &&
          !error &&
          (visible.length ? (
            <>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <caption className="sr-only">รายการข่าวสารและบทความ</caption>
                  <thead>
                    <tr>
                      <th scope="col">บทความ</th>
                      <th scope="col">หมวดหมู่</th>
                      <th scope="col">สถานะ</th>
                      <th scope="col">วันเผยแพร่</th>
                      <th scope="col">
                        <span className="sr-only">จัดการ</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="cms-content-title">
                            <div className="cms-article-thumb">
                              {a.image?.url ? (
                                <Picture value={a.image} />
                              ) : (
                                <FileText size={22} />
                              )}
                            </div>
                            <div>
                              <strong>
                                {a.title.th || a.title.en || "ยังไม่มีชื่อบทความ"}
                              </strong>
                              <small className="cms-muted">
                                /news/{a.slug}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {categories.find((c) => c.id === a.category)?.label
                            .th || a.category}
                        </td>
                        <td>
                          <span
                            className="cms-badge"
                            data-tone={statusTone[effectiveStatus(a)]}
                          >
                            {statusNames[effectiveStatus(a)]}
                          </span>
                        </td>
                        <td>
                          <time dateTime={a.publishedAt}>
                            {date(a.publishedAt)}
                          </time>
                        </td>
                        <td>
                          <div className="cms-row-actions">
                            <button
                              className="cms-secondary"
                              aria-label={"แก้ไข " + (a.title.th || a.slug)}
                              onClick={() => openArticle(a)}
                              disabled={busy}
                            >
                              <Pencil size={16} />
                              <span>แก้ไข</span>
                            </button>
                            <button
                              className="cms-danger"
                              aria-label={"ลบ " + (a.title.th || a.slug)}
                              disabled={busy}
                              onClick={() => remove(a)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={current}
                setPage={setPage}
                total={filtered.length}
                noun="บทความ"
              />
            </>
          ) : (
            <Empty
              icon={FileText}
              title={items.length ? undefined : "เริ่มต้นด้วยบทความแรก"}
              description={
                items.length
                  ? undefined
                  : "เพิ่มข่าวสารหรือเรื่องราวใหม่ แล้วเก็บเป็นฉบับร่างหรือเผยแพร่ได้เมื่อพร้อม"
              }
              onReset={items.length ? reset : undefined}
            />
          ))}
      </section>
    </>
  );
}

export function MediaPanel({ media = [], onRefresh, onNotice }) {
  const [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [page, setPage] = useState(1),
    [fileName, setFileName] = useState("");
  useEffect(() => {
    setPage(1);
  }, [query, type]);
  async function upload(e) {
    e.preventDefault();
    const form = e.currentTarget,
      body = new FormData(form),
      file = body.get("file");
    if (file?.size > 8 * 1024 * 1024) {
      onNotice?.("ไฟล์มีขนาดเกิน 8 MB กรุณาเลือกไฟล์ที่เล็กลง", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/admin/media", { method: "POST", body });
      await onRefresh?.();
      form.reset();
      setFileName("");
      setPage(1);
      onNotice?.("อัปโหลดแล้ว", "success");
    } catch (e) {
      onNotice?.(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  async function copyUrl(m, e) {
    try {
      if (!navigator.clipboard?.writeText) throw Error();
      await navigator.clipboard.writeText(m.url);
      onNotice?.("คัดลอก URL แล้ว", "success");
    } catch {
      const input = e.currentTarget.closest("figure").querySelector("input");
      input.focus();
      input.select();
      onNotice?.("เลือก URL ให้แล้ว กด Ctrl+C หรือคัดลอกบนอุปกรณ์ของคุณ", "success");
    }
  }
  const filtered = media.filter(
    (m) =>
      (type === "all" ||
        (type === "svg"
          ? m.mime === "image/svg+xml"
          : m.mime !== "image/svg+xml")) &&
      [m.name, m.source, m.license].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 12)));
  return (
    <>
      <section className="cms-card cms-upload">
        <div className="cms-card-header">
          <div>
            <h3>เพิ่มสื่อลงคลัง</h3>
            <p>รูปและไอคอนที่อัปโหลดจะเลือกใช้ซ้ำได้ในทุกหน้า</p>
          </div>
          <Upload size={23} aria-hidden="true" />
        </div>
        <form className="cms-card-body" onSubmit={upload}>
          <div className="cms-field-grid">
            <label className="cms-file-picker">
              SVG / PNG / JPEG / WebP (ไม่เกิน 8 MB)
              <input
                name="file"
                type="file"
                accept="image/svg+xml,image/png,image/jpeg,image/webp"
                required
                onChange={(e) => setFileName(e.target.files[0]?.name || "")}
              />
              {fileName && <small>{fileName}</small>}
            </label>
            <div>
              <label>
                แหล่งที่มา / URL
                <input
                  name="source"
                  maxLength={2000}
                  required
                  placeholder="เช่น ภาพถ่ายของบริษัท หรือ URL ต้นฉบับ"
                />
              </label>
              <label>
                สิทธิ์การใช้งาน / เจ้าของ
                <input
                  name="license"
                  maxLength={500}
                  required
                  placeholder="ระบุเจ้าของผลงานหรือสิทธิ์การใช้งาน"
                />
              </label>
            </div>
          </div>
          <div className="cms-toolbar">
            <p className="cms-muted">
              ไฟล์จะถูกตรวจสอบก่อนเก็บ รูป raster จะถูกปรับเป็น WebP
            </p>
            <button className="cms-primary" disabled={busy}>
              <Upload size={16} />
              {busy ? "กำลังอัปโหลด…" : "อัปโหลดและตรวจไฟล์"}
            </button>
          </div>
        </form>
      </section>
      <section className="cms-card">
        <div className="cms-card-header">
          <div>
            <h3>คลังสื่อ</h3>
            <p>{media.length} ไฟล์พร้อมใช้งาน</p>
          </div>
        </div>
        <div className="cms-card-body">
          <div className="cms-field-grid">
            <SearchField
              label="ค้นหาไฟล์"
              value={query}
              onChange={setQuery}
              placeholder="ชื่อไฟล์ ที่มา หรือเจ้าของ"
            />
            <label>
              ประเภทไฟล์
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">ทุกประเภท</option>
                <option value="svg">SVG / ไอคอน</option>
                <option value="image">รูปภาพ</option>
              </select>
            </label>
          </div>
          {filtered.length ? (
            <>
              <div className="cms-media-grid">
                {filtered.slice((current - 1) * 12, current * 12).map((m) => (
                  <figure className="cms-media-item" key={m.id}>
                    <div className="cms-media-image">
                      <img src={m.url} alt={m.name} loading="lazy" />
                    </div>
                    <figcaption>
                      <strong>{m.name}</strong>
                      <span className="cms-badge" data-tone="neutral">
                        {m.mime === "image/svg+xml" ? "SVG" : "WebP"}
                      </span>
                      <p className="cms-muted">
                        ที่มา: {m.source || "ไม่ระบุ"}
                        <br />
                        สิทธิ์: {m.license || "ไม่ระบุ"}
                      </p>
                      <input
                        aria-label={"URL " + m.name}
                        readOnly
                        value={m.url}
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        className="cms-secondary"
                        onClick={(e) => copyUrl(m, e)}
                      >
                        <Copy size={15} />
                        คัดลอก URL
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <Pagination
                page={current}
                setPage={setPage}
                total={filtered.length}
                size={12}
                noun="ไฟล์"
              />
            </>
          ) : (
            <Empty
              icon={ImagePlus}
              title={media.length ? undefined : "คลังสื่อยังว่างอยู่"}
              description={
                media.length
                  ? undefined
                  : "อัปโหลดโลโก้ รูปภาพ หรือไอคอนแรกของคุณจากแบบฟอร์มด้านบน"
              }
              onReset={
                media.length
                  ? () => {
                      setQuery("");
                      setType("all");
                    }
                  : undefined
              }
            />
          )}
        </div>
      </section>
    </>
  );
}

const contactStatus = {
  new: "ยังไม่อ่าน",
  read: "อ่านแล้ว",
  resolved: "ดำเนินการแล้ว",
};
const mailStatus = {
  sent: "ส่งอีเมลแล้ว",
  failed: "ส่งอีเมลไม่สำเร็จ",
  not_configured: "ยังไม่ได้เชื่อมต่ออีเมล",
};
export function ContactsPanel({ onNotice, onChanged }) {
  const { items, loading, error, reload } = useCollection("/admin/contacts");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1),
    [selectedId, setSelectedId] = useState(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setPage(1);
  }, [query, filter]);
  const selected = items.find((c) => c.id === selectedId);
  async function changeStatus(c, status) {
    setBusy(true);
    try {
      await api("/admin/contacts/" + c.id, {
        method: "PATCH",
        body: { status },
      });
      await reload();
      onChanged?.();
      onNotice?.("อัปเดตสถานะข้อความแล้ว", "success");
    } catch (e) {
      onNotice?.(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  async function remove(c) {
    if (!confirm("ลบข้อมูลติดต่อของ “" + c.value.name + "” อย่างถาวร?")) return;
    setBusy(true);
    try {
      await api("/admin/contacts/" + c.id, { method: "DELETE" });
      setSelectedId(null);
      await reload();
      onChanged?.();
      onNotice?.("ลบข้อมูลติดต่อแล้ว", "success");
    } catch (e) {
      onNotice?.(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  const filtered = items.filter(
    (c) =>
      (filter === "all" || c.status === filter) &&
      [c.value.name, c.value.email, c.value.company, c.value.message].some(
        (v) =>
          String(v || "")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  return (
    <>
      <div className="cms-toolbar">
        <p className="cms-muted">
          {items.filter((c) => c.status === "new").length} ข้อความที่ยังไม่อ่าน ·{" "}
          {items.length} ข้อความทั้งหมด
        </p>
        <button className="cms-secondary" onClick={reload} disabled={loading}>
          <RefreshCw size={16} />
          รีเฟรช
        </button>
      </div>
      <section className="cms-card">
        <div className="cms-card-body cms-field-grid">
          <SearchField
            label="ค้นหาข้อความ"
            value={query}
            onChange={setQuery}
            placeholder="ชื่อ อีเมล บริษัท หรือข้อความ"
          />
          <label>
            กรองสถานะข้อความ
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">ทุกสถานะ</option>
              {Object.entries(contactStatus).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <CollectionState loading={loading} error={error} onRetry={reload} />
        {!loading &&
          !error &&
          (selected ? (
            <div className="cms-card-body cms-message-detail">
              <div className="cms-toolbar">
                <button
                  className="cms-secondary"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft size={16} />
                  กลับกล่องข้อความ
                </button>
                <span
                  className="cms-badge"
                  data-tone={selected.status === "new" ? "warning" : "success"}
                >
                  {contactStatus[selected.status]}
                </span>
              </div>
              <h3>ข้อความจาก {selected.value.name}</h3>
              <dl className="cms-contact-meta">
                <div>
                  <dt>อีเมล</dt>
                  <dd>
                    <a href={"mailto:" + selected.value.email}>
                      {selected.value.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>บริษัท</dt>
                  <dd>{selected.value.company || "ไม่ระบุ"}</dd>
                </div>
                <div>
                  <dt>โทรศัพท์</dt>
                  <dd>{selected.value.phone || "ไม่ระบุ"}</dd>
                </div>
                <div>
                  <dt>วันที่ส่ง</dt>
                  <dd>{date(selected.created_at)}</dd>
                </div>
              </dl>
              <p className="cms-message-body">{selected.value.message}</p>
              <p className="cms-muted">
                การแจ้งเตือนทางอีเมล:{" "}
                {mailStatus[selected.mail_status] || "ตรวจสอบสถานะอีกครั้ง"} ·
                ข้อความนี้ถูกเก็บไว้ในระบบแล้ว
              </p>
              <div className="cms-toolbar">
                <label>
                  สถานะข้อความ
                  <select
                    value={selected.status}
                    disabled={busy}
                    onChange={(e) => changeStatus(selected, e.target.value)}
                  >
                    {Object.entries(contactStatus).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="cms-danger"
                  disabled={busy}
                  onClick={() => remove(selected)}
                >
                  <Trash2 size={16} />
                  ลบข้อมูลส่วนบุคคล
                </button>
              </div>
            </div>
          ) : filtered.length ? (
            <>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <caption className="sr-only">กล่องข้อความติดต่อ</caption>
                  <thead>
                    <tr>
                      <th scope="col">ผู้ติดต่อ</th>
                      <th scope="col">ข้อความ</th>
                      <th scope="col">สถานะ</th>
                      <th scope="col">วันที่ส่ง</th>
                      <th scope="col">
                        <span className="sr-only">เปิดข้อความ</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((current - 1) * 8, current * 8).map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.value.name}</strong>
                          <small className="cms-muted">{c.value.email}</small>
                        </td>
                        <td>
                          <p className="cms-message-excerpt">
                            {c.value.message}
                          </p>
                        </td>
                        <td>
                          <span
                            className="cms-badge"
                            data-tone={
                              c.status === "new" ? "warning" : "success"
                            }
                          >
                            {contactStatus[c.status]}
                          </span>
                        </td>
                        <td>{date(c.created_at)}</td>
                        <td>
                          <button
                            className="cms-secondary"
                            onClick={() => setSelectedId(c.id)}
                            aria-label={"เปิดข้อความจาก " + c.value.name}
                          >
                            <Eye size={16} />
                            เปิดข้อความ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={current}
                setPage={setPage}
                total={filtered.length}
                noun="ข้อความ"
              />
            </>
          ) : (
            <Empty
              icon={Inbox}
              title={items.length ? undefined : "ยังไม่มีข้อความติดต่อ"}
              description={
                items.length
                  ? undefined
                  : "เมื่อมีผู้ติดต่อผ่านเว็บไซต์ ข้อความจะแสดงที่นี่เพื่อให้คุณติดตามและดำเนินการต่อได้"
              }
              onReset={
                items.length
                  ? () => {
                      setQuery("");
                      setFilter("all");
                    }
                  : undefined
              }
            />
          ))}
      </section>
    </>
  );
}

export function SubscribersPanel({ onNotice, onChanged }) {
  const { items, loading, error, reload } = useCollection("/admin/subscribers");
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setPage(1);
  }, [query]);
  const filtered = items.filter((s) =>
    s.email.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  async function remove(s) {
    if (!confirm("ลบผู้สมัคร “" + s.email + "” อย่างถาวร?")) return;
    setBusy(true);
    try {
      await api("/admin/subscribers/" + s.id, { method: "DELETE" });
      await reload();
      onChanged?.();
      onNotice?.("ลบผู้สมัครแล้ว", "success");
    } catch (e) {
      onNotice?.(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const cell = (value) =>
      '"' +
      String(value)
        .replace(/^[=+\-@]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const csv =
      "\uFEFF" +
      [
        ["Email", "Subscribed at"],
        ...filtered.map((s) => [s.email, s.created_at]),
      ]
        .map((row) => row.map(cell).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "bsign-subscribers.csv";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotice?.("ดาวน์โหลดรายชื่อ CSV แล้ว", "success");
  }
  return (
    <>
      <div className="cms-toolbar">
        <p className="cms-muted">
          จัดการรายชื่อผู้รับข่าวสารที่บันทึกไว้ในระบบ หน้านี้ยังไม่มีการส่งแคมเปญอีเมล
        </p>
        <button
          className="cms-secondary"
          disabled={!filtered.length}
          onClick={download}
        >
          <Download size={16} />
          ส่งออกรายชื่อ CSV
        </button>
      </div>
      <section className="cms-card">
        <div className="cms-card-body cms-toolbar">
          <SearchField
            label="ค้นหาผู้รับข่าวสาร"
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาด้วยอีเมล"
          />
          <button className="cms-secondary" onClick={reload} disabled={loading}>
            <RefreshCw size={16} />
            รีเฟรช
          </button>
        </div>
        <CollectionState loading={loading} error={error} onRetry={reload} />
        {!loading &&
          !error &&
          (filtered.length ? (
            <>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <caption className="sr-only">รายชื่อผู้สมัครรับข่าวสาร</caption>
                  <thead>
                    <tr>
                      <th scope="col">อีเมล</th>
                      <th scope="col">วันที่สมัคร</th>
                      <th scope="col">
                        <span className="sr-only">จัดการ</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((current - 1) * 8, current * 8).map((s) => (
                      <tr key={s.id}>
                        <td>
                          <span className="cms-inline">
                            <Mail size={16} />
                            {s.email}
                          </span>
                        </td>
                        <td>{date(s.created_at)}</td>
                        <td>
                          <button
                            className="cms-danger"
                            disabled={busy}
                            onClick={() => remove(s)}
                            aria-label={"ลบผู้สมัคร " + s.email}
                          >
                            <Trash2 size={16} />
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={current}
                setPage={setPage}
                total={filtered.length}
                noun="รายชื่อ"
              />
            </>
          ) : (
            <Empty
              icon={Users}
              title={items.length ? undefined : "ยังไม่มีผู้สมัครรับข่าวสาร"}
              description={
                items.length ? undefined : "รายชื่อที่บันทึกใหม่จะแสดงในหน้านี้"
              }
              onReset={items.length ? () => setQuery("") : undefined}
            />
          ))}
      </section>
    </>
  );
}

export function SecurityPanel({ onNotice, onLoggedOut }) {
  const [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget,
      fields = Object.fromEntries(new FormData(form));
    if (fields.password !== fields.confirm) {
      setError("รหัสผ่านใหม่และการยืนยันต้องตรงกัน");
      onNotice?.("รหัสผ่านใหม่และการยืนยันต้องตรงกัน", "error");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api("/password", {
        method: "POST",
        body: { current: fields.current, password: fields.password },
      });
      form.reset();
      onNotice?.("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่", "success");
      await onLoggedOut?.();
    } catch (e) {
      const message = errorText(e);
      setError(message);
      onNotice?.(message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cms-grid cms-grid-2">
      <section className="cms-card">
        <div className="cms-card-header">
          <div>
            <h3>เปลี่ยนรหัสผ่าน</h3>
            <p>ดูแลบัญชีผู้ดูแลให้เข้าถึงได้เฉพาะผู้ที่ได้รับอนุญาต</p>
          </div>
          <ShieldCheck size={24} aria-hidden="true" />
        </div>
        <form className="cms-card-body" onSubmit={submit}>
          <label>
            รหัสผ่านปัจจุบัน
            <input
              type={show ? "text" : "password"}
              name="current"
              autoComplete="current-password"
              maxLength={200}
              required
            />
          </label>
          <label>
            รหัสผ่านใหม่ (12 ตัวอักษรขึ้นไป)
            <input
              type={show ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={200}
              required
            />
          </label>
          <label>
            ยืนยันรหัสผ่านใหม่
            <input
              type={show ? "text" : "password"}
              name="confirm"
              autoComplete="new-password"
              minLength={12}
              maxLength={200}
              required
            />
          </label>
          <button
            type="button"
            className="cms-secondary"
            aria-pressed={show}
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
            {show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          </button>
          {error && (
            <p className="cms-field-error" role="alert">
              {error}
            </p>
          )}
          <div className="cms-savebar">
            <button className="cms-primary" disabled={busy}>
              <ShieldCheck size={16} />
              {busy ? "กำลังเปลี่ยนรหัสผ่าน…" : "เปลี่ยนรหัสผ่านและออกจากทุก session"}
            </button>
          </div>
        </form>
      </section>
      <section className="cms-card">
        <div className="cms-card-body">
          <span className="cms-badge" data-tone="success">
            <Check size={14} />
            บัญชีของคุณ
          </span>
          <h3>รหัสผ่านใหม่ มีผลกับทุกอุปกรณ์</h3>
          <p>
            หลังบันทึก ระบบจะให้ออกจากระบบทุกหน้าต่างและทุกอุปกรณ์
            คุณต้องเข้าสู่ระบบอีกครั้งด้วยรหัสผ่านใหม่
          </p>
          <p className="cms-muted">
            ค่า Password ในไฟล์ initial-admin.txt เป็นรหัสเริ่มต้นเท่านั้น
            หลังเปลี่ยนรหัสผ่านแล้วให้ใช้รหัสใหม่ที่ตั้งในหน้านี้
          </p>
        </div>
      </section>
    </div>
  );
}
