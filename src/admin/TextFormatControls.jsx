import React from "react";
import { textAlignLabels, textStyleLabels } from "../text-format";
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
  const choices = Object.keys(styles || textStyleLabels).filter((key) =>
    Object.hasOwn(textStyleLabels, key),
  );
  return (
    <details className="cms-text-format-controls">
      <summary>
        <span>รูปแบบและการจัดแนวข้อความ</span>
        <small>
          {role} · {align}
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
      <p>ใช้สไตล์ส่วนกลางร่วมกันทั้งภาษาไทยและอังกฤษ รวมขนาดตามหน้าจอ</p>
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
