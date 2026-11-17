import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  FileText,
  Image,
  Inbox,
  Users,
  Globe,
  Database,
  ShieldCheck,
  RefreshCw,
  Save,
  Undo2,
  CheckCircle2,
  AlertCircle,
  Mail,
  LayoutTemplate,
  Palette,
  HardDrive,
} from "lucide-react";
import { api } from "./api";
import { useSite } from "./shared";
import AdminShell from "./admin/AdminShell";
import AdminLogin from "./admin/AdminLogin";
import {
  Field,
  StyleEditor,
  EditorLanguageContext,
  LanguageSwitcher,
} from "./admin/Editors";
import Dashboard from "./admin/Dashboard";
import PageSection from "./admin/PageSection";
import { ImageUploadBusyContext } from "./admin/DeviceImageUpload";
import "./admin/fonts.css";
import {
  ArticlesPanel,
  MediaPanel,
  ContactsPanel,
  SubscribersPanel,
  SecurityPanel,
} from "./admin/ContentPanels";
import { pages, sections, dateText } from "./admin/config";
const clone = (value) => structuredClone(value);
const errors = {
  REVISION_CONFLICT:
    "ข้อมูลถูกแก้ไขจากหน้าต่างอื่น กรุณาเก็บข้อความที่กำลังแก้ไว้ แล้วโหลดข้อมูลล่าสุดก่อนบันทึกอีกครั้ง",
  INVALID_CREDENTIALS: "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง",
  VALIDATION: "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง กรุณาตรวจช่องที่แก้ไข",
  CATEGORY_IN_USE: "หมวดนี้มีบทความใช้งานอยู่ ย้ายบทความไปหมวดอื่นก่อนลบหมวด",
  RATE_LIMIT: "มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
  UNAUTHORIZED: "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
};
function Empty({ icon: Glyph = Inbox, title, children }) {
  return (
    <div className="cms-empty">
      <Glyph size={32} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function SystemPanel({ overview, onRefresh }) {
  if (!overview) return null;
  const { system, counts } = overview;
  return (
    <div className="cms-grid cms-grid-2">
      <section className="cms-card">
        <div className="cms-card-header">
          <div>
            <h3>สถานะระบบ</h3>
            <p>ข้อมูลปัจจุบันจากฐานข้อมูลเว็บไซต์</p>
          </div>
          <Database size={23} />
        </div>
        <div className="cms-card-body">
          <div className="cms-system-state">
            <CheckCircle2 size={30} />
            <div>
              <strong>เชื่อมต่อฐานข้อมูลได้</strong>
              <p>ระบบอ่านข้อมูลเว็บไซต์ได้ตามปกติ</p>
            </div>
          </div>
          <dl className="cms-definition-list">
            <div>
              <dt>เวอร์ชันเว็บไซต์</dt>
              <dd>v{system.version}</dd>
            </div>
            <div>
              <dt>ฐานข้อมูล</dt>
              <dd>{system.database}</dd>
            </div>
            <div>
              <dt>ไฟล์ในคลัง</dt>
              <dd>
                {counts.media} ไฟล์ ·{" "}
                {(system.uploadsBytes / 1048576).toFixed(2)} MB
              </dd>
            </div>
            <div>
              <dt>บัญชีผู้ดูแล</dt>
              <dd>{counts.admins} บัญชี</dd>
            </div>
            <div>
              <dt>การส่งอีเมล</dt>
              <dd>{system.smtpConfigured ? "ตั้งค่าครบแล้ว" : "ยังไม่ได้ตั้งค่า"}</dd>
            </div>
          </dl>
          <p className="cms-hint">
            การรับข้อความลงฐานข้อมูลทำงานแยกจากการส่งอีเมล
            สถานะตั้งค่าอีเมลไม่ได้ยืนยันว่าปลายทางได้รับอีเมลแล้ว
          </p>
          <button className="cms-secondary" onClick={onRefresh}>
            <RefreshCw size={16} />
            ตรวจสถานะอีกครั้ง
          </button>
        </div>
      </section>
      <section className="cms-card">
        <div className="cms-card-header">
          <div>
            <h3>สำรองข้อมูลก่อนอัปเดต</h3>
            <p>เก็บเนื้อหา ภาพ และบัญชีผู้ดูแลให้ครบ</p>
          </div>
          <HardDrive size={23} />
        </div>
        <div className="cms-card-body">
          <ol className="cms-checklist">
            <li>หยุดพรีวิวด้วย Ctrl+C ในหน้าต่าง START-WINDOWS</li>
            <li>เก็บสำเนาโฟลเดอร์โปรเจกต์เดิมไว้ในพื้นที่ที่คุณควบคุมได้</li>
            <li>
              ก่อนเปิดรุ่นใหม่ คัดลอกโฟลเดอร์ .data และไฟล์ .env ไปด้วย
              หากใช้โฟลเดอร์ข้อมูลอื่น ให้เก็บโฟลเดอร์นั้นตามที่ตั้งค่าไว้
            </li>
          </ol>
          <a
            className="cms-secondary"
            href="https://github.com/chanakan20010-cpu/BSIGN-WEB/blob/main/README.md#backup--restore"
            target="_blank"
            rel="noopener noreferrer"
          >
            ดูคู่มือสำรองและกู้คืน <ArrowUpRight size={16} />
          </a>
          <p className="cms-hint">
            สำหรับเซิร์ฟเวอร์และ Docker มีขั้นตอนสำรอง SQLite
            พร้อมรูปภาพและตรวจความครบถ้วนในคู่มือ
          </p>
        </div>
      </section>
    </div>
  );
}
export default function Admin() {
  const site = useSite();
  const [params, setParams] = useSearchParams();
  const requested = params.get("view") || "dashboard";
  const tab =
    requested === "icons"
      ? "global"
      : pages[requested]
        ? requested
        : "dashboard";
  const documentKey = ["header", "footer"].includes(tab) ? "global" : tab;
  const [authenticated, setAuthenticated] = useState(null),
    [docs, setDocs] = useState(null),
    [defaults, setDefaults] = useState(null),
    [draft, setDraft] = useState(null),
    [draftTab, setDraftTab] = useState(null),
    [media, setMedia] = useState([]),
    [overview, setOverview] = useState(null),
    [status, setStatus] = useState(""),
    [tone, setTone] = useState("success"),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [search, setSearch] = useState(""),
    [section, setSection] = useState(null),
    [articleDirty, setArticleDirty] = useState(false),
    [savedAt, setSavedAt] = useState(null),
    [language, setLanguage] = useState("th"),
    [iconDraft, setIconDraft] = useState(null),
    [pendingUploads, setPendingUploads] = useState(0),
    [maintenanceDirty, setMaintenanceDirty] = useState(false);
  const uploadBusy = useCallback(
    (uploading) =>
      setPendingUploads((n) => Math.max(0, n + (uploading ? 1 : -1))),
    [],
  );
  const currentTab = useRef(tab);
  currentTab.current = tab;
  const documentDirty = Boolean(
    docs?.[documentKey] &&
    draftTab === tab &&
    draft &&
    JSON.stringify(draft) !== JSON.stringify(docs[documentKey].value),
  );
  const iconsDirty = Boolean(
    sections[tab] &&
    iconDraft &&
    docs?.icons &&
    JSON.stringify(iconDraft) !== JSON.stringify(docs.icons.value),
  );
  const dirty = documentDirty || iconsDirty;
  const notice = (message, nextTone = "success") => {
    setStatus(message);
    setTone(nextTone);
  };
  const report = (e) =>
    notice(
      errors[e.message] || "ยังทำรายการไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง",
      "error",
    );
  const refreshOverview = async () => {
    try {
      setOverview(await api("/admin/overview"));
    } catch (e) {
      report(e);
    }
  };
  const refreshMedia = async () => {
    setMedia(await api("/admin/media"));
    await refreshOverview();
  };
  async function load() {
    setLoading(true);
    try {
      const [d, f, m, o] = await Promise.all([
        api("/admin/documents"),
        api("/admin/defaults"),
        api("/admin/media"),
        api("/admin/overview"),
      ]);
      setDocs(d);
      site.setContent(
        Object.fromEntries(
          Object.entries(d).map(([key, doc]) => [key, doc.value]),
        ),
      );
      setIconDraft(clone(d.icons.value));
      setDefaults(f);
      setMedia(m);
      setOverview(o);
      setDraft(d[documentKey] ? clone(d[documentKey].value) : null);
      setDraftTab(tab);
    } catch (e) {
      report(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let live = true;
    api("/session")
      .then((s) => live && setAuthenticated(s.authenticated))
      .catch((e) => {
        if (live) {
          setAuthenticated(false);
          report(e);
        }
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (authenticated) load();
  }, [authenticated]);
  useEffect(() => {
    setDraft(docs?.[documentKey] ? clone(docs[documentKey].value) : null);
    setDraftTab(tab);
    setIconDraft(docs?.icons ? clone(docs.icons.value) : null);
    setSection(null);
    setArticleDirty(false);
    setSavedAt(null);
  }, [tab]);
  useEffect(() => {
    if (!dirty && !articleDirty && !maintenanceDirty && !pendingUploads) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, articleDirty, maintenanceDirty, pendingUploads]);
  function navigate(key) {
    if (key === tab) return true;
    if (busy || loading || pendingUploads) {
      notice("กำลังเตรียมหรือบันทึกข้อมูล กรุณารอสักครู่", "warning");
      return false;
    }
    if (
      (dirty || articleDirty || maintenanceDirty) &&
      !window.confirm("มีการแก้ไขที่ยังไม่บันทึก ต้องการออกจากหน้านี้หรือไม่?")
    )
      return false;
    setStatus("");
    setSearch("");
    setParams(key === "dashboard" ? {} : { view: key });
    window.scrollTo({ top: 0, behavior: "instant" });
    return true;
  }
  async function endSession(message = "") {
    setAuthenticated(false);
    setDocs(null);
    setDraft(null);
    setDraftTab(null);
    setOverview(null);
    setArticleDirty(false);
    setMaintenanceDirty(false);
    setParams({});
    await api("/session");
    notice(message);
  }
  async function logout() {
    if (pendingUploads) {
      notice("กำลังอัปโหลดรูปภาพ กรุณารอให้เสร็จก่อนออกจากระบบ", "warning");
      return;
    }
    if (
      (dirty || articleDirty || maintenanceDirty || pendingUploads) &&
      !window.confirm("มีการแก้ไขที่ยังไม่บันทึก ต้องการออกจากระบบหรือไม่?")
    )
      return;
    try {
      await api("/logout", { method: "POST" });
      await endSession();
    } catch (e) {
      report(e);
    }
  }
  async function save() {
    const submitted = documentDirty ? clone(draft) : null;
    const submittedIcons = iconsDirty ? clone(iconDraft) : null;
    setBusy(true);
    setStatus("");
    let savedPart = false;
    try {
      if (submitted) {
        const saved = await api("/admin/documents/" + documentKey, {
          method: "PATCH",
          body: { revision: docs[documentKey].revision, patch: submitted },
        });
        setDocs((d) => ({ ...d, [documentKey]: saved }));
        if (currentTab.current === tab)
          setDraft((current) =>
            JSON.stringify(current) === JSON.stringify(submitted)
              ? clone(saved.value)
              : current,
          );
        site.setContent((c) => ({ ...c, [documentKey]: saved.value }));
        savedPart = true;
      }
      if (submittedIcons) {
        const saved = await api("/admin/documents/icons", {
          method: "PATCH",
          body: { revision: docs.icons.revision, patch: submittedIcons },
        });
        setDocs((d) => ({ ...d, icons: saved }));
        setIconDraft((current) =>
          JSON.stringify(current) === JSON.stringify(submittedIcons)
            ? clone(saved.value)
            : current,
        );
        site.setContent((c) => ({ ...c, icons: saved.value }));
      }
      setSavedAt(new Date());
      notice("บันทึกแล้ว");
    } catch (e) {
      if (savedPart)
        notice(
          "เนื้อหาบันทึกแล้ว แต่ไอคอนยังไม่บันทึก: " +
            (errors[e.message] || "กรุณาลองบันทึกอีกครั้ง"),
          "error",
        );
      else report(e);
    } finally {
      setBusy(false);
    }
  }
  async function saveMaintenance(value) {
    const saved = await api("/admin/documents/maintenance", {
      method: "PATCH",
      body: { revision: docs.maintenance.revision, patch: value },
    });
    setDocs((d) => ({ ...d, maintenance: saved }));
    site.setContent((c) => ({ ...c, maintenance: saved.value }));
    await refreshOverview();
    return saved;
  }
  const knownGroups = sections[tab] || [];
  const leftovers =
    draft && draftTab === tab && !["header", "footer"].includes(tab)
      ? Object.keys(draft).filter(
          (k) =>
            ![
              "editorLabels",
              "footerNav",
              ...(tab === "global"
                ? [
                    "brand",
                    "logo",
                    "footerLogo",
                    "favicon",
                    "nav",
                    "languages",
                    "menuLabel",
                    "skip",
                    "contactHeading",
                    "addressHeading",
                  ]
                : []),
            ].includes(k) && !knownGroups.some((g) => g[3].includes(k)),
        )
      : [];
  const groups = [
    ...knownGroups,
    ...(leftovers.length
      ? [["other", "รายละเอียดเพิ่มเติม", "ข้อความและข้อมูลเพิ่มเติมของหน้านี้", leftovers]]
      : []),
  ];
  const active = groups.find((g) => g[0] === section) || groups[0];
  const stacked = [
    "home",
    "about",
    "news",
    "contact",
    "header",
    "footer",
  ].includes(tab);
  const visibleGroups = stacked ? groups : active ? [active] : [];
  if (authenticated === null)
    return (
      <div className="admin cms-auth">
        <div className="cms-auth-loading" role="status">
          กำลังตรวจสอบการเข้าสู่ระบบ…
        </div>
      </div>
    );
  if (!authenticated)
    return (
      <AdminLogin
        busy={busy}
        status={status}
        onSubmit={async (e) => {
          e.preventDefault();
          const body = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          setStatus("");
          try {
            await api("/login", { method: "POST", body });
            setAuthenticated(true);
          } catch (error) {
            report(error);
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  return (
    <ImageUploadBusyContext.Provider value={uploadBusy}>
      <AdminShell
        tab={tab}
        title={pages[tab][0]}
        description={pages[tab][1]}
        counts={overview?.counts}
        search={search}
        onSearch={setSearch}
        onNavigate={navigate}
        onLogout={logout}
        loading={loading}
      >
        {status && (
          <div
            className="cms-status"
            data-tone={tone}
            role={tone === "error" ? "alert" : "status"}
          >
            {tone === "error" ? (
              <AlertCircle size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
            <span>{status}</span>
            <button aria-label="ปิดข้อความสถานะ" onClick={() => setStatus("")}>
              ×
            </button>
          </div>
        )}
        {loading && !docs ? (
          <div className="cms-card cms-skeleton" role="status">
            กำลังเตรียมพื้นที่ทำงาน…
          </div>
        ) : !docs ? (
          <div className="cms-card">
            <Empty title="ยังโหลดข้อมูลไม่ได้">ตรวจการเชื่อมต่อแล้วลองอีกครั้ง</Empty>
            <button className="cms-secondary" onClick={load}>
              ลองโหลดอีกครั้ง
            </button>
          </div>
        ) : (
          <>
            {tab === "dashboard" && (
              <Dashboard
                overview={overview}
                onNavigate={navigate}
                maintenanceDoc={docs.maintenance}
                onSaveMaintenance={saveMaintenance}
                onMaintenanceDirty={setMaintenanceDirty}
              />
            )}
            {tab === "system" && (
              <SystemPanel overview={overview} onRefresh={refreshOverview} />
            )}
            {sections[tab] && (
              <nav className="cms-website-tabs" aria-label="หน้าเว็บไซต์">
                {[
                  ["global", "ข้อมูลบริษัท"],
                  ["header", "ส่วนหัวเว็บไซต์"],
                  ["footer", "ส่วนท้ายเว็บไซต์"],
                  ["home", "หน้าแรก"],
                  ["about", "เกี่ยวกับเรา"],
                  ["news", "ข่าวสาร"],
                  ["contact", "ติดต่อเรา"],
                  ["cta", "แบนเนอร์ติดต่อ"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-current={tab === key ? "page" : undefined}
                    onClick={() => navigate(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            )}
            {tab === "styles" && (
              <nav className="cms-design-tabs" aria-label="การออกแบบเว็บไซต์">
                {[["styles", "ตัวอักษร"]].map(([key, label]) => (
                  <button
                    key={key}
                    aria-current={tab === key ? "page" : undefined}
                    onClick={() => navigate(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            )}
            {docs[documentKey] && draft && draftTab === tab && (
              <>
                <div className="cms-savebar">
                  <div>
                    <span className="cms-save-indicator" data-dirty={dirty} />
                    <span>
                      {busy
                        ? "กำลังบันทึก…"
                        : pendingUploads
                          ? "กำลังอัปโหลดรูปภาพ…"
                          : dirty
                            ? "คุณมีการแก้ไขที่ยังไม่บันทึก"
                            : savedAt
                              ? "บันทึกเมื่อ " +
                                savedAt.toLocaleTimeString("th-TH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "ข้อมูลทั้งหมดบันทึกแล้ว"}
                    </span>
                  </div>
                  <div className="cms-row-actions">
                    <button
                      className="cms-secondary"
                      disabled={!dirty || busy || pendingUploads > 0}
                      onClick={() => {
                        if (confirm("ยกเลิกการแก้ไขที่ยังไม่บันทึก?")) {
                          setDraft(clone(docs[documentKey].value));
                          setIconDraft(clone(docs.icons.value));
                        }
                      }}
                    >
                      <Undo2 size={16} />
                      ยกเลิกการแก้ไข
                    </button>
                    <button
                      className="cms-primary"
                      disabled={!dirty || busy || pendingUploads > 0}
                      onClick={save}
                    >
                      <Save size={16} />
                      {busy ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}
                    </button>
                  </div>
                </div>
                {sections[tab] && (
                  <div className="cms-language-bar">
                    <div>
                      <Globe size={21} />
                      <div>
                        <strong>
                          กำลังแก้ไขฉบับ{language === "th" ? "ภาษาไทย" : "English"}
                        </strong>
                        <p>แก้ไขภาษาที่เลือก แล้วบันทึกข้อมูลทั้งสองภาษาพร้อมกัน</p>
                      </div>
                    </div>
                    <LanguageSwitcher value={language} onChange={setLanguage} />
                  </div>
                )}
                {tab === "styles" ? (
                  <StyleEditor value={draft} onChange={setDraft} />
                ) : (
                  <div
                    className={
                      "cms-editor-layout" +
                      (stacked ? " cms-stacked-editor" : "")
                    }
                  >
                    {!stacked && (
                      <nav
                        className="cms-section-nav"
                        aria-label="ส่วนที่ต้องการแก้ไข"
                      >
                        {groups.map(([key, label, desc], index) => (
                          <button
                            key={key}
                            onClick={() => setSection(key)}
                            aria-current={
                              active?.[0] === key ? "true" : undefined
                            }
                          >
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <div>
                              <strong>{label}</strong>
                              <small>{desc}</small>
                            </div>
                          </button>
                        ))}
                      </nav>
                    )}
                    <div className="cms-stacked-groups">
                      {visibleGroups.map((group, index) => (
                        <PageSection
                          key={tab + group[0]}
                          page={tab}
                          documentKey={documentKey}
                          group={group}
                          index={index}
                          value={draft}
                          onChange={setDraft}
                          language={language}
                          media={media}
                          icons={iconDraft}
                          defaultIcons={defaults.icons}
                          onIconsChange={setIconDraft}
                          pendingUploads={pendingUploads}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="cms-editor-utilities">
                  <button
                    className="cms-text-button"
                    disabled={busy || pendingUploads > 0}
                    onClick={() => {
                      if (
                        confirm(
                          "นำค่าเริ่มต้นของหมวดนี้มาแทนในแบบร่าง? ยังไม่บันทึกจนกว่าคุณจะกดบันทึก",
                        )
                      ) {
                        if (["header", "footer"].includes(tab)) {
                          setDraft((current) => {
                            const next = clone(current);
                            for (const group of knownGroups)
                              for (const key of group[3])
                                if (Object.hasOwn(defaults.global, key))
                                  next[key] = clone(defaults.global[key]);
                            return next;
                          });
                        } else setDraft(clone(defaults[documentKey]));
                      }
                    }}
                  >
                    คืนค่าเริ่มต้น
                  </button>
                  <button
                    className="cms-text-button"
                    disabled={busy || pendingUploads > 0}
                    onClick={() => {
                      if (
                        !dirty ||
                        confirm("โหลดข้อมูลใหม่และยกเลิกแบบร่างที่ยังไม่บันทึก?")
                      )
                        load().then(() => notice("โหลดข้อมูลใหม่แล้ว"));
                    }}
                  >
                    <RefreshCw size={14} />
                    โหลดข้อมูลใหม่
                  </button>
                </div>
              </>
            )}
            {tab === "articles" && (
              <ArticlesPanel
                categories={docs.news.value.categories}
                media={media}
                onNotice={notice}
                onChanged={refreshOverview}
                onDirtyChange={setArticleDirty}
              />
            )}
            {tab === "media" && (
              <MediaPanel
                media={media}
                onRefresh={refreshMedia}
                onNotice={notice}
              />
            )}
            {tab === "contacts" && (
              <ContactsPanel onNotice={notice} onChanged={refreshOverview} />
            )}
            {tab === "subscribers" && (
              <SubscribersPanel onNotice={notice} onChanged={refreshOverview} />
            )}
            {tab === "password" && (
              <SecurityPanel
                onNotice={notice}
                onLoggedOut={() => endSession("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่")}
              />
            )}
          </>
        )}
      </AdminShell>
    </ImageUploadBusyContext.Provider>
  );
}
