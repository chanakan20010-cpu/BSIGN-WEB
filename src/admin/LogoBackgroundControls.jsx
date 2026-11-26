import React, { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { logoBackground } from "../logo-appearance";
import "./logo-background.css";

const isHex = (value) => /^#[0-9a-fA-F]{6}$/.test(value || "");

export default function LogoBackgroundControls({
  value,
  onChange,
  label = "โลโก้",
  defaultBackground = "transparent",
}) {
  const background = logoBackground(value, defaultBackground);
  const color = isHex(background) ? background : "#ffffff";
  const [draft, setDraft] = useState(color);
  useEffect(() => setDraft(color), [color]);
  function setBackground(next) {
    onChange({ ...value, background: next });
  }
  function changeColor(next) {
    setDraft(next);
    if (isHex(next)) setBackground(next);
  }
  return (
    <fieldset className="cms-logo-background-controls">
      <legend>พื้นหลังกรอบโลโก้</legend>
      <div className="cms-logo-background-fields">
        <label>
          เลือกสี
          <input
            type="color"
            aria-label={`สีพื้นหลังโลโก้ ${label}`}
            value={color}
            onChange={(event) => changeColor(event.target.value)}
          />
        </label>
        <label>
          รหัสสี HEX
          <input
            type="text"
            aria-label={`รหัสสีพื้นหลังโลโก้ ${label}`}
            value={draft}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={!isHex(draft)}
            onChange={(event) => changeColor(event.target.value)}
            onBlur={() => !isHex(draft) && setDraft(color)}
          />
        </label>
        <button
          className="cms-secondary"
          type="button"
          aria-label={`คืนค่าสีพื้นหลังโลโก้ ${label}`}
          disabled={background === defaultBackground}
          onClick={() => setBackground(defaultBackground)}
        >
          <RotateCcw size={15} aria-hidden="true" /> คืนค่า
        </button>
      </div>
      <label className="cms-logo-background-transparent">
        <input
          type="checkbox"
          aria-label={`ไม่มีพื้นหลัง ${label}`}
          checked={background === "transparent"}
          onChange={(event) =>
            setBackground(
              event.target.checked
                ? "transparent"
                : isHex(draft)
                  ? draft
                  : "#ffffff",
            )
          }
        />
        ไม่มีพื้นหลัง
      </label>
      {!isHex(draft) && (
        <small className="cms-logo-background-error" role="status">
          ใช้ # ตามด้วยรหัสสี 6 ตัว เช่น #ffffff
        </small>
      )}
      <p className="cms-hint">
        สีนี้ใช้กับกรอบรอบโลโก้ หากไฟล์ภาพมีพื้นหลังติดมา สีภายในภาพจะยังคงเดิม
      </p>
    </fieldset>
  );
}
