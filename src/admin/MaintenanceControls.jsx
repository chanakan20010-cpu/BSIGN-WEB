import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Globe, Power, Save, Wrench } from "lucide-react";
import "./maintenance.css";

const clone = (value) => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function MaintenanceControls({
  document,
  onSave,
  version,
  onDirtyChange,
}) {
  const [draft, setDraft] = useState(() => document && clone(document.value));
  const previous = useRef(document?.value);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const dirty = Boolean(
    document &&
    draft &&
    (!same(draft.title, document.value.title) ||
      !same(draft.message, document.value.message)),
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!document) return;
    const former = previous.current;
    previous.current = document.value;
    setDraft((current) =>
      !current || same(current, former)
        ? clone(document.value)
        : { ...current, enabled: document.value.enabled },
    );
  }, [document]);

  if (!document || !draft) {
    return (
      <section
        className="cms-card cms-maintenance-controls"
        aria-label="สถานะเว็บไซต์"
      >
        <div className="cms-card-body" role="status">
          กำลังโหลดสถานะเว็บไซต์…
        </div>
      </section>
    );
  }

  const enabled = document.value.enabled;
  const update = (key, language, value) => {
    setDraft((current) => ({
      ...current,
      [key]: { ...current[key], [language]: value },
    }));
    setNotice(null);
  };

  async function save(nextEnabled = enabled) {
    const before = clone(draft);
    const submitted = { ...before, enabled: nextEnabled };
    setBusy(true);
    setNotice(null);
    try {
      const result = await onSave(submitted);
      const value = result.value;
      setDraft((current) =>
        same(current, before)
          ? clone(value)
          : { ...current, enabled: value.enabled },
      );
      setNotice({
        error: false,
        text:
          nextEnabled !== enabled
            ? nextEnabled
              ? "ปิดเว็บไซต์เพื่อปรับปรุงแล้ว ผู้เยี่ยมชมจะเห็นข้อความที่บันทึกไว้"
              : "เปิดเว็บไซต์แล้ว ผู้เยี่ยมชมเข้าชมเนื้อหาได้ตามปกติ"
            : "บันทึกข้อความปิดปรับปรุงแล้ว",
      });
    } catch (error) {
      setNotice({
        error: true,
        text:
          error.message === "REVISION_CONFLICT"
            ? "สถานะถูกแก้ไขจากหน้าต่างอื่น กรุณาเก็บข้อความที่แก้ไว้แล้วโหลดหน้านี้ใหม่"
            : "บันทึกสถานะเว็บไซต์ไม่สำเร็จ กรุณาลองอีกครั้ง",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="cms-site-status cms-card cms-maintenance-controls"
      aria-labelledby="cms-maintenance-heading"
      aria-busy={busy}
    >
      <div className="cms-card-body">
        <div className="cms-site-status-heading">
          <span className="cms-site-status-icon" data-maintenance={enabled}>
            {enabled ? (
              <Wrench size={25} aria-hidden="true" />
            ) : (
              <Globe size={26} aria-hidden="true" />
            )}
          </span>
          <div>
            <h3 id="cms-maintenance-heading">สถานะเว็บไซต์</h3>
            <p className="cms-maintenance-state" data-maintenance={enabled}>
              <i className="cms-status-dot" />
              {enabled ? "เว็บไซต์ปิดปรับปรุง" : "เว็บไซต์เปิดให้เข้าชม"}
            </p>
          </div>
          <button
            className={enabled ? "cms-primary" : "cms-secondary"}
            onClick={() => save(!enabled)}
            disabled={busy}
          >
            <Power size={17} aria-hidden="true" />
            {enabled ? "เปิดเว็บไซต์" : "ปิดเว็บไซต์เพื่อปรับปรุง"}
          </button>
        </div>
        <p className="cms-muted cms-maintenance-description">
          เมื่อปิดปรับปรุง ผู้เยี่ยมชมทุกหน้าจะเห็นข้อความด้านล่าง ระบบหลังบ้านยังจัดการได้ตามปกติ
          ปุ่มเปิด/ปิดจะบันทึกข้อความปัจจุบันพร้อมสถานะเว็บไซต์
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="cms-maintenance-languages">
            {[
              ["th", "ภาษาไทย"],
              ["en", "English"],
            ].map(([language, label]) => (
              <fieldset key={language}>
                <legend>{label}</legend>
                <label>
                  หัวข้อปิดปรับปรุง ({label})
                  <input
                    aria-label={`หัวข้อปิดปรับปรุง (${label})`}
                    lang={language}
                    value={draft.title[language]}
                    maxLength={30000}
                    onChange={(event) =>
                      update("title", language, event.target.value)
                    }
                  />
                </label>
                <label>
                  ข้อความปิดปรับปรุง ({label})
                  <textarea
                    aria-label={`ข้อความปิดปรับปรุง (${label})`}
                    lang={language}
                    rows={3}
                    value={draft.message[language]}
                    maxLength={30000}
                    onChange={(event) =>
                      update("message", language, event.target.value)
                    }
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <div className="cms-maintenance-actions">
            <a
              className="cms-text-button"
              href="/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ดูหน้าเว็บไซต์ <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <button
              className="cms-secondary"
              type="submit"
              disabled={!dirty || busy}
            >
              <Save size={16} aria-hidden="true" />
              {busy ? "กำลังบันทึก…" : "บันทึกข้อความปิดปรับปรุง"}
            </button>
          </div>
        </form>
        {notice && (
          <p
            className="cms-maintenance-notice"
            data-error={notice.error}
            role={notice.error ? "alert" : "status"}
          >
            {notice.text}
          </p>
        )}
        <div className="cms-site-status-footer">
          <span>
            {dirty ? "มีข้อความที่ยังไม่บันทึก" : "สถานะและข้อความตรงกับข้อมูลที่บันทึกไว้"}
          </span>
          <span>BSIGN TECH CMS · v{version}</span>
        </div>
      </div>
    </section>
  );
}
