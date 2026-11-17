import React, { useContext } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { EditorLanguageContext, Field } from "./Editors";
import { DeviceImageUpload } from "./DeviceImageUpload";
import { FormattedText, Picture, useSite } from "../shared";
import "./article-paragraphs.css";

export const emptyParagraph = () => ({
  id: crypto.randomUUID(),
  text: { th: "", en: "" },
  image: null,
  align: "center",
  ratio: "original",
});

const normalized = (text) =>
  String(text || "")
    .trim()
    .replace(/\s+/g, " ");
const splitParagraphs = (text) =>
  String(text || "")
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);

// Existing articles retain their source fields. The paragraph draft provides the
// complete saved content without repeating a teaser as the body of the article.
export function articleParagraphs(article) {
  if (Array.isArray(article.blocks)) return structuredClone(article.blocks);
  const blocks = [],
    seen = { th: new Set(), en: new Set() };
  for (const key of ["lead", "body", "secondaryBody"]) {
    const th = splitParagraphs(article[key]?.th);
    const en = splitParagraphs(article[key]?.en);
    for (let i = 0; i < Math.max(th.length, en.length); i++) {
      const block = emptyParagraph();
      block.text = {
        ...structuredClone(article[key] || {}),
        th: "",
        en: "",
      };
      for (const language of ["th", "en"]) {
        const value = (language === "th" ? th : en)[i] || "";
        const comparable = normalized(value);
        if (comparable && !seen[language].has(comparable)) {
          block.text[language] = value.trim();
          seen[language].add(comparable);
        }
      }
      if (key === "secondaryBody" && i === 0 && article.inlineImage?.url) {
        block.image = structuredClone(article.inlineImage);
        block.align = "left";
      }
      if (block.text.th || block.text.en || block.image) blocks.push(block);
    }
  }
  if (
    article.inlineImage?.url &&
    !blocks.some((block) => block.image?.url === article.inlineImage.url)
  ) {
    blocks.push({
      ...emptyParagraph(),
      image: structuredClone(article.inlineImage),
    });
  }
  if (!blocks.length) {
    const block = emptyParagraph();
    block.text = {
      ...structuredClone(article.excerpt || {}),
      th: article.excerpt?.th || "",
      en: article.excerpt?.en || "",
    };
    blocks.push(block);
  }
  return blocks;
}

const ratioValue = (ratio) =>
  ratio === "original" ? undefined : ratio.replace(":", " / ");
const previewTone = (color) => {
  if (!/^#[0-9a-f]{6}$/i.test(color || "")) return "light";
  const channels = color
    .slice(1)
    .match(/../g)
    .map((part) => parseInt(part, 16));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
    160
    ? "dark"
    : "light";
};

export default function ArticleParagraphs({
  value,
  onChange,
  onUploadBusy,
  disabled = false,
}) {
  const language = useContext(EditorLanguageContext) || "th";
  const { content } = useSite();
  function change(index, patch) {
    onChange(
      value.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    );
  }
  function move(index, offset) {
    const next = [...value];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  return (
    <section
      className="cms-card cms-paragraph-editor cms-article-section"
      id="article-content"
      aria-labelledby="article-content-heading"
    >
      <div className="cms-card-header">
        <div>
          <span className="cms-article-step">ส่วนที่ 2</span>
          <h3 id="article-content-heading">เนื้อหาบทความ</h3>
          <p>เรียงลำดับย่อหน้า เลือกรูปแบบข้อความ และจัดวางภาพประกอบ</p>
        </div>
        <span className="cms-badge">{value.length} ย่อหน้า</span>
      </div>
      <div className="cms-card-body">
        {!value.length && (
          <p className="cms-muted">ยังไม่มีย่อหน้า กดเพิ่มย่อหน้าเพื่อเริ่มเขียนเนื้อหา</p>
        )}
        {value.map((block, index) => (
          <fieldset
            key={block.id}
            className="cms-paragraph-block"
            disabled={disabled}
          >
            <legend>ย่อหน้า {index + 1}</legend>
            <div className="cms-paragraph-toolbar">
              <span className="cms-muted">ลำดับเนื้อหาที่แสดงบนเว็บไซต์</span>
              <div className="cms-row-actions">
                <button
                  type="button"
                  aria-label={`ย้ายย่อหน้า ${index + 1} ขึ้น`}
                  disabled={index === 0 || disabled}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`ย้ายย่อหน้า ${index + 1} ลง`}
                  disabled={index === value.length - 1 || disabled}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="cms-danger"
                  aria-label={`ลบย่อหน้า ${index + 1}`}
                  onClick={() => {
                    if (
                      (block.text?.th || block.text?.en || block.image?.url) &&
                      !confirm(`ลบย่อหน้า ${index + 1} และรูปของย่อหน้านี้จากแบบร่าง?`)
                    )
                      return;
                    onChange(value.filter((_, i) => i !== index));
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" /> ลบ
                </button>
              </div>
            </div>
            <Field
              path={`articles.blocks.${index}.body`}
              value={block.text}
              onChange={(text) => change(index, { text })}
            />
            <details className="cms-article-text-preview">
              <summary>ตัวอย่างรูปแบบข้อความ</summary>
              <div
                className="cms-article-preview-paper"
                data-tone={previewTone(
                  content.styles[block.text.format?.style]?.color ||
                    content.styles.body?.color,
                )}
              >
                <FormattedText
                  as="p"
                  className="type-body"
                  value={block.text}
                  lang={language}
                >
                  {block.text[language] ||
                    (language === "th"
                      ? "ตัวอย่างข้อความในย่อหน้านี้"
                      : "Paragraph text preview")}
                </FormattedText>
              </div>
            </details>
            <div className="cms-paragraph-image-tools">
              <DeviceImageUpload
                label={`อัปโหลดรูปย่อหน้า ${index + 1} จากเครื่อง`}
                onBusyChange={onUploadBusy}
                disabled={disabled}
                onUploaded={(images) => {
                  const image = images[0];
                  if (image) change(index, { image });
                }}
              />
              {!block.image?.url && (
                <p className="cms-muted">
                  <ImagePlus size={16} aria-hidden="true" /> เพิ่มรูปได้หนึ่งรูปต่อย่อหน้า
                </p>
              )}
            </div>
            {block.image?.url && (
              <>
                <div className="cms-paragraph-image-options">
                  <label>
                    ตำแหน่งรูปย่อหน้า {index + 1}
                    <select
                      aria-label={`ตำแหน่งรูปย่อหน้า ${index + 1}`}
                      value={block.align}
                      onChange={(e) => change(index, { align: e.target.value })}
                    >
                      <option value="left">ชิดซ้าย · ข้อความด้านขวา</option>
                      <option value="center">กึ่งกลาง · รูปเหนือข้อความ</option>
                      <option value="right">ชิดขวา · ข้อความด้านซ้าย</option>
                    </select>
                  </label>
                  <label>
                    อัตราส่วนรูปย่อหน้า {index + 1}
                    <select
                      aria-label={`อัตราส่วนรูปย่อหน้า ${index + 1}`}
                      value={block.ratio}
                      onChange={(e) => change(index, { ratio: e.target.value })}
                    >
                      <option value="original">อัตราส่วนเดิม</option>
                      <option value="16:9">16:9 · แนวนอน</option>
                      <option value="4:3">4:3 · แนวนอน</option>
                      <option value="1:1">1:1 · จัตุรัส</option>
                      <option value="3:4">3:4 · แนวตั้ง</option>
                    </select>
                  </label>
                </div>
                <div
                  className="cms-paragraph-image-preview"
                  data-align={block.align}
                  data-ratio={block.ratio}
                  style={{ aspectRatio: ratioValue(block.ratio) }}
                >
                  <Picture value={block.image} />
                </div>
                <Field
                  path={`articles.blocks.${index}.image.alt`}
                  value={block.image.alt}
                  onChange={(alt) =>
                    change(index, { image: { ...block.image, alt } })
                  }
                />
                <button
                  type="button"
                  className="cms-text-button"
                  onClick={() => change(index, { image: null })}
                >
                  <Trash2 size={15} aria-hidden="true" /> นำรูปย่อหน้านี้ออก
                </button>
              </>
            )}
          </fieldset>
        ))}
        <button
          type="button"
          className="cms-secondary"
          disabled={disabled || value.length >= 100}
          onClick={() => onChange([...value, emptyParagraph()])}
        >
          <Plus size={17} aria-hidden="true" /> เพิ่มย่อหน้าถัดไป
        </button>
        <p className="cms-muted cms-paragraph-help">
          ปรับตำแหน่งและอัตราส่วนเฉพาะย่อหน้านี้ รูปจะเรียงเหนือข้อความบนหน้าจอเล็ก
          ข้อมูลจะแสดงจริงเมื่อบันทึกบทความ
        </p>
      </div>
    </section>
  );
}
