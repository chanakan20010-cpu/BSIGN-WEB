import React, { useEffect, useState } from "react";
import {
  isCustomTextColor,
  textAlignLabels,
  textStyleLabels,
} from "../text-format";
import { FormattedText } from "../shared";
import "./text-format-controls.css";

export default function TextFormatControls({
  value,
  onChange,
  label,
  styles,
  text,
  language = "th",
}) {
  const format = value || {};
  const role = textStyleLabels[format.style] || "ตามตำแหน่งเดิม";
  const align = textAlignLabels[format.align] || "ตามตำแหน่งเดิม";
  const customColor = isCustomTextColor(format.color) ? format.color : null;
  const inheritedColor = styles?.[format.style]?.color || styles?.body?.color;
  const displayedColor =
    customColor ||
    (isCustomTextColor(inheritedColor) ? inheritedColor : "#111111");
  const [colorDraft, setColorDraft] = useState(displayedColor);
  useEffect(() => setColorDraft(displayedColor), [displayedColor]);
  const updateColor = (next) => {
    setColorDraft(next);
    if (isCustomTextColor(next)) onChange({ ...format, color: next });
  };
  const choices = Object.keys(styles || textStyleLabels).filter((key) =>
    Object.hasOwn(textStyleLabels, key),
  );
  return (
    <details className="cms-text-format-controls">
      <summary>
        <span>รูปแบบ สี และการจัดแนวข้อความ</span>
        <small>
          {role} · {align} · {customColor || "สีตามสไตล์"}
        </small>
      </summary>
      <div className="cms-text-format-fields">
        <label>
          รูปแบบข้อความ
          <select
            aria-label={`รูปแบบข้อความ ${label}`}
            value={format.style || "inherit"}
            onChange={(event) =>
              onChange({ ...format, style: event.target.value })
            }
          >
            <option value="inherit">ตามตำแหน่งเดิม</option>
            {choices.map((key) => (
              <option key={key} value={key}>
                {textStyleLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          การจัดแนวข้อความ
          <select
            aria-label={`การจัดแนวข้อความ ${label}`}
            value={format.align || "inherit"}
            onChange={(event) =>
              onChange({ ...format, align: event.target.value })
            }
          >
            <option value="inherit">ตามตำแหน่งเดิม</option>
            {Object.entries(textAlignLabels).map(([key, title]) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="cms-text-color-controls">
        <legend>สีข้อความเฉพาะส่วนนี้</legend>
        <div className="cms-text-color-fields">
          <label>
            เลือกสี
            <input
              type="color"
              aria-label={`สีข้อความ ${label}`}
              value={displayedColor}
              onChange={(event) => updateColor(event.target.value)}
            />
          </label>
          <label>
            รหัสสี HEX
            <input
              type="text"
              className="cms-text-color-hex"
              aria-label={`รหัสสี HEX ${label}`}
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
            aria-label={`ใช้สีตามสไตล์ ${label}`}
            disabled={!customColor}
            onClick={() => onChange({ ...format, color: "inherit" })}
          >
            ใช้สีตามสไตล์
          </button>
        </div>
        {!isCustomTextColor(colorDraft) && (
          <small className="cms-text-color-error" role="status">
            ใช้ # ตามด้วยรหัสสี 6 ตัว เช่น #805b00
          </small>
        )}
        <small>
          เปลี่ยนเฉพาะข้อความนี้ ใช้ร่วมกันทั้งภาษาไทยและอังกฤษ โดยไม่เปลี่ยนสีของข้อความส่วนอื่น
        </small>
      </fieldset>
      <p>รูปแบบและขนาดตามหน้าจอใช้สไตล์ส่วนกลางร่วมกันทั้งภาษาไทยและอังกฤษ</p>
      {text && (
        <div
          className="cms-text-format-preview"
          data-tone={
            ["inverse", "footer", "footerHeading", "footerBrand"].includes(
              format.style,
            )
              ? "dark"
              : "light"
          }
        >
          <small>ตัวอย่างก่อนบันทึก</small>
          <FormattedText
            as="p"
            value={{ ...text, format }}
            className="type-body"
            lang={language}
          >
            {text[language] ||
              (language === "en" ? "Text preview" : "ตัวอย่างข้อความ")}
          </FormattedText>
        </div>
      )}
    </details>
  );
}
