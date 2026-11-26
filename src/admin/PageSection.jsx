import React from "react";
import { PencilLine } from "lucide-react";
import { Field, EditorLanguageContext, EditorPageContext } from "./Editors";
import PageIcons from "./PageIcons";
import { sections } from "./config";
import "./editor-workspace.css";

export default function PageSection({
  page,
  documentKey,
  group,
  index,
  value,
  onChange,
  language,
  media,
  icons,
  defaultIcons,
  onIconsChange,
  pendingUploads = 0,
}) {
  const labels = value.editorLabels || {},
    sectionKey = `${page}.${group[0]}`;
  const custom = labels.sections?.[sectionKey] || {};
  const title = custom.title ?? group[1],
    description = custom.description ?? group[2];
  const configuredGroups = sections[page] || [];
  const configuredIndex = configuredGroups.findIndex(
    ([key]) => key === group[0],
  );
  const sequence = (configuredIndex < 0 ? index : configuredIndex) + 1;
  const sectionId = `editor-section-${page}-${group[0]}`;
  const hasOutline =
    index === 0 &&
    ["home", "about", "news", "header", "footer"].includes(page) &&
    configuredGroups.length > 1;
  function updateLabel(key, text) {
    onChange((current) => ({
      ...current,
      editorLabels: {
        ...current.editorLabels,
        sections: {
          ...current.editorLabels?.sections,
          [sectionKey]: {
            ...current.editorLabels?.sections?.[sectionKey],
            [key]: text,
          },
        },
      },
    }));
  }
  const fields = group[3].filter((key) => Object.hasOwn(value, key));
  function field(key) {
    return (
      <Field
        key={`${page}.${key}`}
        path={`${documentKey}.${key}`}
        value={value[key]}
        media={media}
        onChange={(next) =>
          onChange((current) => ({ ...current, [key]: next }))
        }
      />
    );
  }
  const imageColumns =
    fields.includes("hero") &&
    fields.some((key) => ["title", "intro"].includes(key));
  return (
    <>
      {hasOutline && (
        <nav className="cms-page-outline" aria-label="ไปยังส่วนที่ต้องการแก้ไข">
          <span className="cms-page-outline-label">ไปยังส่วนที่ต้องการแก้ไข</span>
          <div>
            {configuredGroups.map(([key, fallback], position) => (
              <a key={key} href={`#editor-section-${page}-${key}`}>
                <span aria-hidden="true">
                  {String(position + 1).padStart(2, "0")}
                </span>
                {labels.sections?.[`${page}.${key}`]?.title?.trim() || fallback}
              </a>
            ))}
          </div>
        </nav>
      )}
      <section
        className="cms-card cms-editor-card cms-page-section"
        id={sectionId}
        data-section={group[0]}
        aria-labelledby={`${sectionId}-heading`}
      >
        <div className="cms-card-header cms-page-section-header">
          <span className="cms-section-number" aria-hidden="true">
            {String(sequence).padStart(2, "0")}
          </span>
          <div className="cms-section-heading-copy">
            <h3 id={`${sectionId}-heading`}>{title?.trim() || group[1]}</h3>
            <p>{description}</p>
          </div>
          <details className="cms-section-name-editor">
            <summary>
              <PencilLine size={15} aria-hidden="true" /> ปรับชื่อส่วน
            </summary>
            <div>
              <p className="cms-hint">
                ชื่อและคำอธิบายนี้ใช้จัดหมวดในหลังบ้าน ข้อความบนเว็บไซต์แก้ในช่องเนื้อหาด้านล่าง
              </p>
              <label>
                ชื่อส่วนในหลังบ้าน
                <input
                  aria-label={`ชื่อส่วนในหลังบ้าน ${group[1]}`}
                  value={title}
                  maxLength={300}
                  onChange={(e) => updateLabel("title", e.target.value)}
                />
              </label>
              <label>
                คำอธิบายส่วนในหลังบ้าน
                <input
                  aria-label={`คำอธิบายส่วนในหลังบ้าน ${group[1]}`}
                  value={description}
                  maxLength={500}
                  onChange={(e) => updateLabel("description", e.target.value)}
                />
              </label>
            </div>
          </details>
        </div>
        <div className="cms-card-body cms-document-fields">
          <EditorPageContext.Provider
            value={{
              page,
              labels,
              onLabelsChange: (next) =>
                onChange((current) => ({ ...current, editorLabels: next })),
              icons,
              defaultIcons,
              uploading: pendingUploads > 0,
            }}
          >
            <EditorLanguageContext.Provider value={language}>
              {imageColumns ? (
                <div className="cms-page-intro-grid">
                  <div>{fields.filter((key) => key !== "hero").map(field)}</div>
                  <div>{field("hero")}</div>
                </div>
              ) : (
                fields.map(field)
              )}
            </EditorLanguageContext.Provider>
          </EditorPageContext.Provider>
          <PageIcons
            page={page}
            group={group[0]}
            value={value}
            icons={icons}
            defaults={defaultIcons}
            onChange={onIconsChange}
          />
        </div>
      </section>
    </>
  );
}
