import React, { useEffect, useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  cardAppearanceStyle,
  defaultCardAppearance,
  normalizeCardAppearance,
} from "../card-appearance";
import "./card-appearance.css";

function hexColor(value) {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match ? "#" + match[1].toLowerCase() : null;
}

function AppearanceColor({
  title,
  label,
  value,
  fallback,
  onChange,
  disabled,
}) {
  const id = useId();
  const helpId = id + "-help";
  const transparent = value === "transparent";
  const [draft, setDraft] = useState(transparent ? fallback : value);
  const [error, setError] = useState("");
  useEffect(() => {
    if (value !== "transparent") setDraft(value);
    setError("");
  }, [value]);

  function changeDraft(text) {
    setDraft(text);
    setError("");
    const next = hexColor(text);
    if (next) onChange(next);
  }

  function finishDraft() {
    if (transparent) return;
    const next = hexColor(draft);
    if (next) {
      setDraft(next);
      onChange(next);
    } else {
      setDraft(value);
      setError("กรุณาใช้รหัส HEX 6 หลัก เช่น #f1f2f4");
    }
  }

  return (
    <div className="cms-appearance-color">
      <span className="cms-appearance-color-title">{title}</span>
      <div className="cms-appearance-color-inputs">
        <label className="cms-appearance-swatch">
          <span className="sr-only">{`เลือก${title} ${label}`}</span>
          <input
            type="color"
            value={hexColor(draft) || fallback}
            disabled={disabled || transparent}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
              onChange(event.target.value);
            }}
          />
        </label>
        <label htmlFor={id} className="sr-only">
          {`รหัส${title} HEX ${label}`}
        </label>
        <input
          id={id}
          type="text"
          value={draft}
          placeholder="#f1f2f4"
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          disabled={disabled || transparent}
          aria-describedby={helpId}
          aria-invalid={error ? "true" : undefined}
          onChange={(event) => changeDraft(event.target.value)}
          onBlur={finishDraft}
        />
      </div>
      <label className="cms-appearance-transparent">
        <input
          type="checkbox"
          checked={transparent}
          disabled={disabled}
          onChange={(event) => {
            setError("");
            onChange(
              event.target.checked
                ? "transparent"
                : hexColor(draft) || fallback,
            );
          }}
        />
        {`ไม่ใช้${title}`}
      </label>
      <small id={helpId} role={error ? "status" : undefined}>
        {error || (transparent ? "โปร่งใส" : "ใช้รหัส HEX 6 หลัก")}
      </small>
    </div>
  );
}

export default function CardAppearanceEditor({
  value,
  onChange,
  defaults = defaultCardAppearance,
  label = "การ์ดจุดเด่น",
  path,
  disabled = false,
}) {
  const current = normalizeCardAppearance(value, defaults);
  const original = normalizeCardAppearance(defaults);
  const setColor = (key, color) =>
    onChange({ ...value, ...current, [key]: color });
  return (
    <fieldset
      className="cms-card-appearance-editor"
      data-field-path={path || undefined}
      disabled={disabled}
    >
      <legend>สีพื้นหลังและเส้นกรอบ</legend>
      <p className="cms-appearance-scope">
        การเปลี่ยนแปลงมีผลเฉพาะการ์ดนี้ บันทึกด้วยปุ่มบันทึกการเปลี่ยนแปลงด้านบน
      </p>
      <div className="cms-appearance-fields">
        <AppearanceColor
          title="สีพื้นหลัง"
          label={label}
          value={current.background}
          fallback={
            original.background === "transparent"
              ? "#f1f2f4"
              : original.background
          }
          disabled={disabled}
          onChange={(color) => setColor("background", color)}
        />
        <AppearanceColor
          title="สีเส้นกรอบ"
          label={label}
          value={current.border}
          fallback={
            original.border === "transparent" ? "#e8e4df" : original.border
          }
          disabled={disabled}
          onChange={(color) => setColor("border", color)}
        />
      </div>
      <div className="cms-appearance-preview-wrap">
        <span>ตัวอย่างก่อนบันทึก</span>
        <div
          className="cms-appearance-preview"
          style={cardAppearanceStyle(current)}
        >
          <strong>การ์ดจุดเด่นของเรา</strong>
          <p>สีพื้นหลังและเส้นกรอบจะใช้กับการ์ดนี้ทั้งภาษาไทยและภาษาอังกฤษ</p>
        </div>
      </div>
      <button
        type="button"
        className="cms-secondary cms-appearance-reset"
        disabled={disabled}
        onClick={() => onChange({ ...value, ...original })}
      >
        <RotateCcw size={15} aria-hidden="true" />
        คืนค่าสีการ์ดนี้
      </button>
    </fieldset>
  );
}
