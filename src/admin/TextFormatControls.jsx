import React, { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  RemoveFormatting,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react";
import {
  inheritedTextFormat,
  isCustomTextColor,
  textAlignLabels,
  textStyleLabels,
} from "../text-format";
import { useFontLibrary } from "../font-library";
import PublicTextPreview from "./PublicTextPreview";
import "./text-format-controls.css";

function NumberControl({
  value,
  onChange,
  fallback,
  label,
  minimum,
  maximum,
  step = 1,
}) {
  const display = typeof value === "number" ? String(value) : "";
  const [draft, setDraft] = useState(display);
  useEffect(() => setDraft(display), [display]);
  return (
    <input
      type="number"
      aria-label={label}
      min={minimum}
      max={maximum}
      step={step}
      value={draft}
      placeholder={String(fallback ?? "")}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next === "") onChange("inherit");
        else {
          const number = Number(next);
          if (Number.isFinite(number) && number >= minimum && number <= maximum)
            onChange(number);
        }
      }}
      onBlur={() => setDraft(display)}
    />
  );
}
function ToolButton({ label, pressed, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      className={"cms-ribbon-button " + className}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export default function TextFormatControls({
  value,
  onChange,
  label,
  styles,
  text,
  language = "th",
  path,
  defaultRole = "body",
  previewContext = "text",
  legacyColor,
}) {
  const format = value || {};
  const { fonts } = useFontLibrary();
  const roleKey = Object.hasOwn(textStyleLabels, format.style)
    ? format.style
    : defaultRole;
  const roleStyle = styles?.[roleKey] || styles?.body || {};
  const role = textStyleLabels[format.style] || "ตามตำแหน่งเดิม";
  const align = textAlignLabels[format.align] || "ตามตำแหน่งเดิม";
  const customColor = isCustomTextColor(format.color) ? format.color : null;
  const inheritedColor = legacyColor || roleStyle.color;
  const displayedColor =
    customColor ||
    (isCustomTextColor(inheritedColor) ? inheritedColor : "#111111");
  const highlight = isCustomTextColor(format.background)
    ? format.background
    : null;
  const [colorDraft, setColorDraft] = useState(displayedColor);
  const [highlightDraft, setHighlightDraft] = useState(highlight || "");
  useEffect(() => setColorDraft(displayedColor), [displayedColor]);
  useEffect(() => setHighlightDraft(highlight || ""), [highlight]);
  const set = (key, next) => onChange({ ...format, [key]: next });
  const updateColor = (next) => {
    setColorDraft(next);
    if (isCustomTextColor(next)) set("color", next);
  };
  const updateHighlight = (next) => {
    setHighlightDraft(next);
    if (isCustomTextColor(next)) set("background", next);
  };
  const effectiveWeight =
    typeof format.weight === "number" ? format.weight : roleStyle.weight || 400;
  const choices = Object.keys(styles || textStyleLabels).filter((key) =>
    Object.hasOwn(textStyleLabels, key),
  );
  const alignIcons = {
    left: AlignLeft,
    center: AlignCenter,
    right: AlignRight,
    justify: AlignJustify,
    distributed: AlignJustify,
  };
  return (
    <div className="cms-text-editor-tools" data-format-path={path}>
      <div
        className="cms-text-ribbon"
        role="toolbar"
        aria-label={"จัดรูปแบบข้อความ " + label}
        onKeyDown={(event) => {
          if (
            event.target.tagName !== "BUTTON" ||
            !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
          )
            return;
          const buttons = [
              ...event.currentTarget.querySelectorAll("button:not(:disabled)"),
            ],
            index = buttons.indexOf(event.target);
          if (index < 0) return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
        }}
      >
        <div
          className="cms-ribbon-font-group"
          role="group"
          aria-label="รูปแบบและแบบอักษร"
        >
          <label className="cms-ribbon-style">
            <span>สไตล์ข้อความ</span>
            <select
              aria-label={"รูปแบบข้อความ " + label}
              value={format.style || "inherit"}
              onChange={(event) => set("style", event.target.value)}
            >
              <option value="inherit">ตามตำแหน่งเดิม</option>
              {choices.map((key) => (
                <option key={key} value={key}>
                  {textStyleLabels[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="cms-ribbon-font">
            <span>ฟอนต์</span>
            <select
              aria-label={"ฟอนต์ข้อความ " + label}
              value={format.font || "inherit"}
              onChange={(event) => set("font", event.target.value)}
            >
              <option value="inherit">
                ตามรูปแบบ · {roleStyle.font || "ค่าเดิม"}
              </option>
              {fonts.map((font) => (
                <option key={font.family} value={font.family}>
                  {font.label || font.family}
                </option>
              ))}
            </select>
          </label>
          <label className="cms-ribbon-size">
            <span>ขนาด · px</span>
            <NumberControl
              label={"ขนาดข้อความ " + label}
              value={format.size}
              fallback={roleStyle.size || 14}
              minimum={10}
              maximum={100}
              onChange={(next) => set("size", next)}
            />
          </label>
        </div>
        <div className="cms-ribbon-tools-row">
          <div
            className="cms-ribbon-group"
            role="group"
            aria-label="ลักษณะตัวอักษร"
          >
            <ToolButton
              label={"ตัวหนา " + label}
              pressed={effectiveWeight >= 600}
              onClick={() => set("weight", effectiveWeight >= 600 ? 400 : 700)}
            >
              <Bold size={16} />
            </ToolButton>
            <ToolButton
              label={"ตัวเอียง " + label}
              pressed={format.italic === true}
              onClick={() => set("italic", format.italic !== true)}
            >
              <Italic size={16} />
            </ToolButton>
            <ToolButton
              label={"ขีดเส้นใต้ " + label}
              pressed={format.underline === true}
              onClick={() => set("underline", format.underline !== true)}
            >
              <Underline size={16} />
            </ToolButton>
            <ToolButton
              label={"ขีดฆ่า " + label}
              pressed={format.strike === true}
              onClick={() => set("strike", format.strike !== true)}
            >
              <Strikethrough size={16} />
            </ToolButton>
          </div>
          <div
            className="cms-ribbon-group cms-ribbon-colors"
            role="group"
            aria-label="สีข้อความและไฮไลต์"
          >
            <label
              className="cms-ribbon-color"
              title={"สีข้อความ " + label}
              style={{ "--ribbon-color": displayedColor }}
            >
              <Type size={17} aria-hidden="true" />
              <span className="sr-only">สีข้อความ</span>
              <input
                type="color"
                aria-label={"สีข้อความ " + label}
                value={displayedColor}
                onChange={(event) => updateColor(event.target.value)}
              />
            </label>
            <label
              className="cms-ribbon-color"
              title={"สีไฮไลต์ " + label}
              style={{ "--ribbon-color": highlight || "#f5ce52" }}
            >
              <Highlighter size={17} aria-hidden="true" />
              <span className="sr-only">สีไฮไลต์</span>
              <input
                type="color"
                aria-label={"สีไฮไลต์ " + label}
                value={highlight || "#fff2a8"}
                onChange={(event) => updateHighlight(event.target.value)}
              />
            </label>
          </div>
          <div
            className="cms-ribbon-group cms-ribbon-align"
            role="group"
            aria-label="จัดแนวข้อความ"
          >
            {["left", "center", "right", "justify", "distributed"].map(
              (key) => {
                const Glyph = alignIcons[key];
                return (
                  <ToolButton
                    key={key}
                    label={textAlignLabels[key] + " " + label}
                    pressed={format.align === key}
                    onClick={() => set("align", key)}
                    className={
                      key === "distributed" ? "cms-distributed-button" : ""
                    }
                  >
                    <Glyph size={16} />
                    {key === "distributed" && <span aria-hidden="true">↔</span>}
                  </ToolButton>
                );
              },
            )}
          </div>
          <ToolButton
            label={"ล้างรูปแบบข้อความ " + label}
            onClick={() => onChange({ ...format, ...inheritedTextFormat })}
          >
            <RemoveFormatting size={17} />
          </ToolButton>
        </div>
      </div>
      <details className="cms-text-format-controls">
        <summary>
          <span>ตัวเลือกสีและระยะห่าง</span>
          <small>
            {role} · {align} · {customColor || "สีตามสไตล์"}
          </small>
        </summary>
        <div className="cms-text-format-fields">
          <label>
            การจัดแนวข้อความ
            <select
              aria-label={"การจัดแนวข้อความ " + label}
              value={format.align || "inherit"}
              onChange={(event) => set("align", event.target.value)}
            >
              <option value="inherit">ตามตำแหน่งเดิม</option>
              {Object.entries(textAlignLabels).map(([key, title]) => (
                <option key={key} value={key}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <label>
            น้ำหนักตัวอักษร
            <select
              aria-label={"น้ำหนักข้อความ " + label}
              value={format.weight || "inherit"}
              onChange={(event) =>
                set(
                  "weight",
                  event.target.value === "inherit"
                    ? "inherit"
                    : Number(event.target.value),
                )
              }
            >
              <option value="inherit">ตามรูปแบบ</option>
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
            </select>
          </label>
          <label>
            ระยะบรรทัด · เท่า
            <NumberControl
              label={"ระยะบรรทัดข้อความ " + label}
              value={format.line}
              fallback={roleStyle.line || 1.65}
              minimum={1}
              maximum={3}
              step={0.05}
              onChange={(next) => set("line", next)}
            />
          </label>
          <label>
            ระยะตัวอักษร · px
            <NumberControl
              label={"ระยะตัวอักษรข้อความ " + label}
              value={format.spacing}
              fallback={roleStyle.spacing || 0}
              minimum={-4}
              maximum={20}
              step={0.1}
              onChange={(next) => set("spacing", next)}
            />
          </label>
        </div>
        <fieldset className="cms-text-color-controls">
          <legend>สีข้อความและไฮไลต์</legend>
          <div className="cms-text-color-fields">
            <label>
              รหัสสีข้อความ · HEX
              <input
                type="text"
                className="cms-text-color-hex"
                aria-label={"รหัสสี HEX " + label}
                value={colorDraft}
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={!isCustomTextColor(colorDraft)}
                onChange={(event) => updateColor(event.target.value)}
                onBlur={() => {
                  if (!isCustomTextColor(colorDraft))
                    setColorDraft(displayedColor);
                }}
              />
            </label>
            <button
              type="button"
              className="cms-text-color-reset"
              aria-label={"ใช้สีตามสไตล์ " + label}
              disabled={!customColor}
              onClick={() => set("color", "inherit")}
            >
              ใช้สีตามสไตล์
            </button>
            <label>
              รหัสสีไฮไลต์ · HEX
              <input
                type="text"
                aria-label={"รหัสสีไฮไลต์ HEX " + label}
                value={highlightDraft}
                placeholder="ไม่มีสีไฮไลต์"
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={
                  Boolean(highlightDraft) && !isCustomTextColor(highlightDraft)
                }
                onChange={(event) => updateHighlight(event.target.value)}
                onBlur={() => {
                  if (!isCustomTextColor(highlightDraft))
                    setHighlightDraft(highlight || "");
                }}
              />
            </label>
            <button
              type="button"
              className="cms-text-color-reset"
              aria-label={"ล้างสีไฮไลต์ " + label}
              disabled={!highlight}
              onClick={() => set("background", "inherit")}
            >
              ไม่มีสีไฮไลต์
            </button>
          </div>
          {!isCustomTextColor(colorDraft) && (
            <small className="cms-text-color-error" role="status">
              ใช้ # ตามด้วยรหัสสี 6 ตัว เช่น #805b00
            </small>
          )}
        </fieldset>
      </details>
      <p className="cms-text-format-hint">
        ใช้กับข้อความในช่องนี้ทั้งภาษาไทยและอังกฤษ
        เลือกสไตล์เดิมหรือกดล้างรูปแบบเพื่อกลับไปใช้ค่าตามตำแหน่ง
      </p>
      {text && (
        <div className="cms-text-format-preview">
          <PublicTextPreview
            value={{ ...text, format }}
            role={defaultRole}
            context={previewContext}
            legacyColor={legacyColor}
            language={language}
            styles={styles}
            title="ตัวอย่างบนเว็บไซต์"
          />
        </div>
      )}
    </div>
  );
}
