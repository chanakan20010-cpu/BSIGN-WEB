import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Search,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { api } from "../api";
import { builtInFonts, requestedFonts } from "../font-catalog.js";
import { useFontLibrary } from "../font-library.jsx";
import "./font-library.css";

const maxFileSize = 5 * 1024 * 1024;
const sampleText = "ออกแบบสิ่งที่เป็นคุณ — Beautiful ideas, thoughtfully made.";
const bundledFonts = builtInFonts.filter((font) => font.package);
const errors = {
  FONT_FORMAT: "รองรับเฉพาะไฟล์ WOFF2, WOFF, TTF และ OTF",
  FONT_INVALID: "ไม่สามารถอ่านฟอนต์นี้ได้ ไฟล์อาจเสียหายหรือเนื้อหาไม่ตรงกับชนิดไฟล์",
  FONT_COLLECTION: "ไฟล์รวมหลายฟอนต์ยังไม่รองรับ กรุณาเลือกไฟล์ฟอนต์เดี่ยว",
  FONT_TOO_LARGE: "ไฟล์ฟอนต์ต้องมีขนาดไม่เกิน 5 MB",
  FONT_EXPANDED_SIZE: "ข้อมูลฟอนต์หลังคลายการบีบอัดมีขนาดเกินที่ระบบรองรับ (32 MB)",
  FONT_FILE_REQUIRED: "กรุณาเลือกไฟล์ฟอนต์ก่อนอัปโหลด",
  FONT_SOURCE: "แหล่งที่มาต้องเป็น URL แบบ http:// หรือ https:// ที่ไม่มีชื่อผู้ใช้หรือรหัสผ่าน",
  FONT_IN_USE: "ฟอนต์นี้กำลังถูกใช้งาน กรุณาเปลี่ยนฟอนต์ในส่วนที่อ้างอิงก่อนลบ",
  FONT_NOT_FOUND: "ไม่พบฟอนต์นี้ อาจถูกลบจากหน้าต่างอื่นแล้ว กรุณาโหลดรายการใหม่",
  FONT_UNAVAILABLE: "ฟอนต์นี้ไม่มีในคลังแล้ว กรุณาโหลดรายการใหม่",
  FONT_INVALID_RECORD: "ข้อมูลฟอนต์ในคลังไม่สมบูรณ์ กรุณาติดต่อผู้ดูแลระบบ",
  LIMIT_FILE_SIZE: "ไฟล์ฟอนต์ต้องมีขนาดไม่เกิน 5 MB",
  LIMIT_FILE_COUNT: "อัปโหลดได้ครั้งละ 1 ไฟล์",
  LIMIT_UNEXPECTED_FILE: "อัปโหลดได้ครั้งละ 1 ไฟล์ กรุณาเลือกไฟล์ใหม่",
  LIMIT_FIELD_VALUE: "ข้อมูลที่มาหรือสิทธิ์การใช้งานยาวเกินไป กรุณาย่อข้อความ",
  LIMIT_FIELD_COUNT: "ข้อมูลอัปโหลดไม่ถูกต้อง กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง",
  LIMIT_PART_COUNT: "ข้อมูลอัปโหลดไม่ถูกต้อง กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง",
  CSRF_FAILED: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง",
  CSRF: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง",
  ORIGIN: "ไม่สามารถยืนยันที่มาของคำขอได้ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง",
  UNAUTHORIZED: "กรุณาเข้าสู่ระบบเพื่อจัดการฟอนต์",
  AUTH_REQUIRED: "กรุณาเข้าสู่ระบบเพื่อจัดการฟอนต์",
  RATE_LIMIT: "อัปโหลดบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง",
  VALIDATION_ERROR: "กรุณาตรวจสอบชื่อ ที่มา และสิทธิ์การใช้งานของฟอนต์",
  VALIDATION: "กรุณาตรวจสอบชื่อ ที่มา และสิทธิ์การใช้งานของฟอนต์",
};
function errorMessage(error) {
  return (
    errors[error?.message] || "ดำเนินการไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง"
  );
}
function weightsText(font) {
  return font.weightRange
    ? `${font.weightRange[0]}–${font.weightRange[1]} (Variable)`
    : (font.weights || [font.weight]).join(", ");
}
function referenceText(value) {
  const pages = {
    global: "ข้อมูลเว็บไซต์",
    styles: "รูปแบบตัวอักษร",
    home: "หน้าแรก",
    about: "เกี่ยวกับเรา",
    services: "บริการ",
    news: "ข่าวสาร",
    contact: "ติดต่อเรา",
    footer: "ส่วนท้ายเว็บไซต์",
    login: "หน้าเข้าสู่ระบบ",
  };
  return (
    pages[value] ||
    (value.startsWith("article:") ? `บทความ ${value.slice(8)}` : value)
  );
}
function safeSource(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function FontPreview({ font, text, size }) {
  return (
    <p
      className="cms-font-preview"
      data-font-family={font.family}
      style={{
        fontFamily: `"${font.family}", "Noto Sans Thai", sans-serif`,
        fontSize: size,
        fontWeight: font.weight || 400,
        fontStyle: font.style || "normal",
      }}
    >
      {text || sampleText}
    </p>
  );
}

export default function FontLibraryPanel() {
  const { refresh } = useFontLibrary();
  const componentId = useId();
  const alive = useRef(true),
    fileInput = useRef(null);
  const [customFonts, setCustomFonts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [notice, setNotice] = useState(null);
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState("");
  const [source, setSource] = useState("");
  const [license, setLicense] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(sampleText);
  const [previewSize, setPreviewSize] = useState(28);
  const busy = uploading || Boolean(deleting);
  const query = search.trim().toLocaleLowerCase();
  const matches = (font) =>
    `${font.family} ${font.label} ${font.originalName || ""}`
      .toLocaleLowerCase()
      .includes(query);
  const visibleCustom = customFonts.filter(matches);
  const visibleBundled = bundledFonts.filter(matches);

  const loadFonts = useCallback(async () => {
    if (alive.current) setLoading(true);
    try {
      const result = await api("/admin/fonts");
      if (alive.current) setCustomFonts(result);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    loadFonts().catch((error) => {
      if (alive.current) setNotice({ error: true, text: errorMessage(error) });
    });
    return () => {
      alive.current = false;
    };
  }, [loadFonts]);

  async function refreshPublicFonts() {
    try {
      await refresh();
      return true;
    } catch {
      return false;
    }
  }
  async function reload() {
    setNotice(null);
    try {
      await loadFonts();
      await refreshPublicFonts();
    } catch (error) {
      if (alive.current) setNotice({ error: true, text: errorMessage(error) });
    }
  }
  async function upload(event) {
    event.preventDefault();
    if (busy) return;
    if (!file)
      return setNotice({ error: true, text: errors.FONT_FILE_REQUIRED });
    if (!/\.(woff2?|ttf|otf)$/i.test(file.name))
      return setNotice({ error: true, text: errors.FONT_FORMAT });
    if (file.size > maxFileSize)
      return setNotice({ error: true, text: errors.FONT_TOO_LARGE });
    if (source.trim() && !safeSource(source.trim()))
      return setNotice({ error: true, text: errors.FONT_SOURCE });
    setUploading(true);
    setNotice(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("label", label.trim());
      body.set("source", source.trim());
      body.set("license", license.trim());
      const result = await api("/admin/fonts", { method: "POST", body });
      if (alive.current) {
        setCustomFonts((current) => [result, ...current]);
        setFile(null);
        setLabel("");
        setSource("");
        setLicense("");
        if (fileInput.current) fileInput.current.value = "";
      }
      const refreshed = await refreshPublicFonts();
      if (alive.current)
        setNotice({
          error: false,
          text: `เพิ่มฟอนต์ “${result.label}” แล้ว เลือกใช้ได้ในตัวเลือกรูปแบบตัวอักษร${refreshed ? "" : " กรุณาโหลดหน้าใหม่เพื่ออัปเดตตัวเลือก"}`,
        });
    } catch (error) {
      if (alive.current) setNotice({ error: true, text: errorMessage(error) });
    } finally {
      if (alive.current) setUploading(false);
    }
  }
  async function remove(font) {
    if (busy || font.inUse) return;
    setDeleting(font.id);
    setNotice(null);
    try {
      await api(`/admin/fonts/${font.id}`, { method: "DELETE" });
      if (alive.current) {
        setCustomFonts((current) =>
          current.filter((item) => item.id !== font.id),
        );
        setConfirmDelete("");
      }
      await refreshPublicFonts();
      if (alive.current)
        setNotice({ error: false, text: `ลบฟอนต์ “${font.label}” แล้ว` });
    } catch (error) {
      if (alive.current) setNotice({ error: true, text: errorMessage(error) });
      if (
        error.message === "FONT_IN_USE" ||
        error.message === "FONT_NOT_FOUND"
      ) {
        if (alive.current) setConfirmDelete("");
        try {
          await loadFonts();
        } catch {
          /* Keep the actionable deletion error visible. */
        }
      }
    } finally {
      if (alive.current) setDeleting("");
    }
  }

  return (
    <div className="cms-font-library" data-testid="font-library">
      <section
        className="cms-card cms-font-intro"
        aria-labelledby={`${componentId}-heading`}
      >
        <div className="cms-font-heading">
          <span className="cms-font-symbol">
            <Type size={26} aria-hidden="true" />
          </span>
          <div>
            <h2 id={`${componentId}-heading`}>คลังฟอนต์</h2>
            <p className="cms-muted">
              เลือกฟอนต์ให้เข้ากับเว็บไซต์ และเพิ่มฟอนต์ของคุณได้ในที่เดียว
            </p>
          </div>
          <div className="cms-font-counts" aria-label="จำนวนฟอนต์">
            <span>
              <strong>{requestedFonts.length}</strong> ฟอนต์ไทย
            </span>
            <span>
              <strong>{customFonts.length}</strong> ฟอนต์ที่อัปโหลด
            </span>
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={`cms-font-notice ${notice.error ? "is-error" : "is-success"}`}
          role={notice.error ? "alert" : "status"}
        >
          {!notice.error && <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{notice.text}</span>
        </div>
      )}

      <section
        className="cms-card cms-font-upload"
        aria-labelledby={`${componentId}-upload-heading`}
        aria-busy={uploading}
      >
        <div className="cms-font-section-heading">
          <div>
            <h3 id={`${componentId}-upload-heading`}>เพิ่มฟอนต์จากอุปกรณ์</h3>
            <p className="cms-muted">อัปโหลดแล้วเลือกใช้ได้ทันทีในส่วนที่ตั้งค่าฟอนต์</p>
          </div>
          <Upload size={22} aria-hidden="true" />
        </div>
        <form onSubmit={upload}>
          <div className="cms-font-upload-grid">
            <label className="cms-font-file-field">
              ไฟล์ฟอนต์
              <input
                ref={fileInput}
                name="file"
                type="file"
                accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                disabled={busy || loading}
                aria-describedby={`${componentId}-file-help`}
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setNotice(null);
                }}
              />
              <span id={`${componentId}-file-help`} className="cms-muted">
                WOFF2, WOFF, TTF หรือ OTF · ไม่เกิน 5 MB ต่อไฟล์
              </span>
            </label>
            <label>
              ชื่อที่แสดงในตัวเลือก
              <input
                name="label"
                value={label}
                maxLength={100}
                disabled={busy}
                placeholder="เว้นว่างเพื่อใช้ชื่อจากไฟล์ฟอนต์"
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
          </div>
          <details className="cms-font-upload-details">
            <summary>ที่มาและสิทธิ์การใช้งาน (ไม่บังคับ)</summary>
            <div className="cms-font-upload-grid">
              <label>
                แหล่งที่มาของฟอนต์
                <input
                  name="source"
                  type="url"
                  value={source}
                  maxLength={2000}
                  disabled={busy}
                  placeholder="https://example.com/font"
                  onChange={(event) => setSource(event.target.value)}
                />
              </label>
              <label>
                สิทธิ์การใช้งาน
                <textarea
                  name="license"
                  value={license}
                  maxLength={1000}
                  disabled={busy}
                  rows={2}
                  placeholder="เช่น SIL Open Font License 1.1 หรือรายละเอียดใบอนุญาต"
                  onChange={(event) => setLicense(event.target.value)}
                />
              </label>
            </div>
          </details>
          <div className="cms-font-upload-footer">
            <p className="cms-muted">เลือกฟอนต์ที่คุณมีสิทธิ์ใช้งานและเผยแพร่บนเว็บไซต์</p>
            <button
              type="submit"
              className="cms-primary"
              disabled={busy || loading || !file}
            >
              <Upload size={17} aria-hidden="true" />
              {uploading ? "กำลังตรวจสอบและอัปโหลด…" : "อัปโหลดฟอนต์"}
            </button>
          </div>
        </form>
      </section>

      <section
        className="cms-card cms-font-browse"
        aria-labelledby={`${componentId}-browse-heading`}
      >
        <div className="cms-font-section-heading">
          <div>
            <h3 id={`${componentId}-browse-heading`}>ดูตัวอย่างฟอนต์</h3>
            <p className="cms-muted">ลองพิมพ์ข้อความเพื่อเปรียบเทียบก่อนเลือกใช้</p>
          </div>
          <button
            type="button"
            className="cms-secondary"
            onClick={reload}
            disabled={busy || loading}
            aria-label="โหลดรายการฟอนต์ใหม่"
          >
            <RefreshCw size={16} aria-hidden="true" />
            {loading ? "กำลังโหลด…" : "โหลดรายการใหม่"}
          </button>
        </div>
        <div className="cms-font-preview-controls">
          <label className="cms-font-sample-field">
            ข้อความตัวอย่าง
            <input
              value={preview}
              maxLength={180}
              onChange={(event) => setPreview(event.target.value)}
            />
          </label>
          <label className="cms-font-size-field">
            ขนาดตัวอย่าง · {previewSize} px
            <input
              type="range"
              min="18"
              max="48"
              value={previewSize}
              onChange={(event) => setPreviewSize(Number(event.target.value))}
            />
          </label>
          <label className="cms-font-search-field">
            <span>
              <Search size={15} aria-hidden="true" /> ค้นหาฟอนต์
            </span>
            <input
              type="search"
              value={search}
              placeholder="ชื่อฟอนต์หรือชื่อไฟล์"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="cms-font-list-heading">
          <h4>ฟอนต์ที่อัปโหลด</h4>
          <span>{customFonts.length} ฟอนต์</span>
        </div>
        {loading ? (
          <p className="cms-font-empty" role="status">
            กำลังโหลดคลังฟอนต์…
          </p>
        ) : visibleCustom.length ? (
          <div className="cms-font-grid cms-font-custom-grid">
            {visibleCustom.map((font) => (
              <article
                className="cms-font-card"
                key={font.id}
                data-font-id={font.id}
              >
                <div className="cms-font-card-heading">
                  <div>
                    <h4>{font.label}</h4>
                    <span className="cms-font-card-subtitle">
                      {font.format.toUpperCase()} · น้ำหนัก {weightsText(font)}
                      {font.style === "italic" ? " · ตัวเอียง" : ""}
                    </span>
                  </div>
                  <span
                    className={`cms-font-badge ${font.inUse ? "is-used" : ""}`}
                  >
                    {font.inUse ? "กำลังใช้งาน" : "พร้อมใช้งาน"}
                  </span>
                </div>
                <FontPreview font={font} text={preview} size={previewSize} />
                {font.inUse && (
                  <div className="cms-font-usage">
                    <strong>ใช้งานใน</strong>
                    <ul>
                      {font.usedIn.map((reference) => (
                        <li key={reference}>{referenceText(reference)}</li>
                      ))}
                    </ul>
                    <p>เปลี่ยนฟอนต์ในส่วนเหล่านี้ก่อนลบ</p>
                  </div>
                )}
                <details className="cms-font-metadata">
                  <summary>ข้อมูลไฟล์และสิทธิ์การใช้งาน</summary>
                  <dl>
                    <div>
                      <dt>ชื่อไฟล์เดิม</dt>
                      <dd>{font.originalName}</dd>
                    </div>
                    <div>
                      <dt>ชื่อฟอนต์ในไฟล์</dt>
                      <dd>{font.metadata?.familyName || "—"}</dd>
                    </div>
                    <div>
                      <dt>รูปแบบย่อย</dt>
                      <dd>{font.metadata?.subfamilyName || "—"}</dd>
                    </div>
                    <div>
                      <dt>PostScript</dt>
                      <dd>{font.metadata?.postscriptName || "—"}</dd>
                    </div>
                    <div>
                      <dt>จำนวนรูปอักษร</dt>
                      <dd>
                        {Number(font.metadata?.numGlyphs || 0).toLocaleString(
                          "th-TH",
                        )}{" "}
                        glyphs
                      </dd>
                    </div>
                    <div>
                      <dt>วันที่อัปโหลด</dt>
                      <dd>
                        {font.createdAt &&
                        !Number.isNaN(Date.parse(font.createdAt))
                          ? new Date(font.createdAt).toLocaleString("th-TH")
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>แหล่งที่มา</dt>
                      <dd>
                        {safeSource(font.source) ? (
                          <a
                            href={safeSource(font.source)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {font.source}
                          </a>
                        ) : (
                          "ไม่ได้ระบุ"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>สิทธิ์การใช้งาน</dt>
                      <dd className="cms-font-license-text">
                        {font.license || "ไม่ได้ระบุ"}
                      </dd>
                    </div>
                  </dl>
                </details>
                <div className="cms-font-card-footer">
                  {confirmDelete === font.id ? (
                    <div className="cms-font-delete-confirm">
                      <span>ยืนยันลบ “{font.label}”?</span>
                      <div>
                        <button
                          type="button"
                          className="cms-secondary"
                          disabled={busy}
                          onClick={() => setConfirmDelete("")}
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          className="cms-danger"
                          disabled={busy}
                          onClick={() => remove(font)}
                        >
                          {deleting === font.id ? "กำลังลบ…" : "ยืนยันลบฟอนต์"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="cms-danger"
                      disabled={busy || font.inUse}
                      title={
                        font.inUse ? "เปลี่ยนฟอนต์ในส่วนที่ใช้งานก่อนลบ" : undefined
                      }
                      onClick={() => setConfirmDelete(font.id)}
                      aria-label={`ลบฟอนต์ ${font.label}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      ลบฟอนต์
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="cms-font-empty">
            <Type size={28} aria-hidden="true" />
            <p>{query ? "ไม่พบฟอนต์ที่อัปโหลดตรงกับคำค้น" : "ยังไม่มีฟอนต์ที่อัปโหลด"}</p>
            <span>
              {query ? "ลองค้นหาด้วยชื่ออื่น" : "เพิ่มฟอนต์ของคุณได้จากแบบฟอร์มด้านบน"}
            </span>
          </div>
        )}

        <div className="cms-font-list-heading">
          <h4>ฟอนต์ที่ติดตั้งในระบบ</h4>
          <span>
            {bundledFonts.length} ฟอนต์ · รวมฟอนต์ไทย {requestedFonts.length} แบบ
          </span>
        </div>
        {visibleBundled.length ? (
          <div className="cms-font-grid cms-font-bundled-grid">
            {visibleBundled.map((font) => (
              <article
                className="cms-font-card"
                key={font.family}
                data-font-family={font.family}
              >
                <div className="cms-font-card-heading">
                  <h4>{font.label}</h4>
                  <span className="cms-font-badge">ติดตั้งแล้ว</span>
                </div>
                <FontPreview font={font} text={preview} size={previewSize} />
                <div className="cms-font-bundled-meta">
                  <span>น้ำหนัก {weightsText(font)}</span>
                  <a
                    href={`/font-licenses/${font.slug}/LICENSE.txt`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    OFL-1.1 ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="cms-font-empty">ไม่พบฟอนต์ในระบบตรงกับคำค้น</p>
        )}
      </section>
    </div>
  );
}
