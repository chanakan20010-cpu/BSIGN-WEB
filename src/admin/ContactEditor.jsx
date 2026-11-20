import React, { useContext, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  MessageSquare,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";
import { Icon, useSite } from "../shared";
import {
  createSocialChannel,
  getSocialPlatform,
  SOCIAL_PLATFORMS,
  socialIconDefaults,
} from "../social-catalog";
import {
  EditorLanguageContext,
  EditorPageContext,
  Field,
  InlineIconEditor,
} from "./Editors";
import "./contact-editor.css";

const copy = (value) => structuredClone(value);
const formFields = {
  name: "ชื่อผู้ติดต่อ",
  company: "บริษัทหรือองค์กร",
  email: "อีเมลสำหรับติดต่อกลับ",
  phone: "หมายเลขโทรศัพท์",
  message: "รายละเอียดข้อความ",
};
const sections = [
  ["intro", "หัวข้อหน้า", "ข้อความแนะนำก่อนเข้าสู่ข้อมูลติดต่อ"],
  ["channels", "ข้อมูลติดต่อ", "อีเมล โทรศัพท์ และเวลาทำการ พร้อมไอคอนแต่ละรายการ"],
  ["socials", "โซเชียลมีเดีย", "จัดการบัญชี ลิงก์ และไอคอนภายในช่องทางแต่ละรายการ"],
  [
    "form",
    "แบบฟอร์มและข้อความตอบกลับ",
    "ชื่อช่อง ข้อความตัวอย่าง ข้อตกลง ปุ่ม และสถานะการส่ง",
  ],
  ["map", "สำนักงานและแผนที่", "ข้อมูลสำนักงาน ลิงก์นำทาง และพิกัดที่ยืนยันแล้ว"],
];

/** onChange follows React's setter contract, as PageSection does. */
export default function ContactEditor({
  value,
  onChange,
  media = [],
  icons,
  onIconsChange,
  iconDefaults,
  defaultIcons,
  global,
  onOpenCompany,
  language,
  pendingUploads = 0,
}) {
  const inheritedLanguage = useContext(EditorLanguageContext);
  const site = useSite();
  const selectedLanguage = language || inheritedLanguage || "th";
  const company = global || site?.content?.global || {};
  const [newPlatform, setNewPlatform] = useState("facebook");
  const [notice, setNotice] = useState("");
  const defaults = iconDefaults || defaultIcons;
  const labels = value.editorLabels || {};
  const availableIcons = icons || site?.content?.icons;
  const updating = pendingUploads > 0;
  const sharedText = (text) =>
    typeof text === "string"
      ? text
      : text?.[selectedLanguage] || text?.th || text?.en || "ยังไม่ได้ระบุ";
  function update(key, next) {
    onChange((current) => ({ ...current, [key]: next }));
  }
  function field(key, current = value[key], set = (next) => update(key, next)) {
    if (current === undefined) return null;
    return (
      <Field
        key={key}
        path={`contact.${key}`}
        value={current}
        media={media}
        onChange={set}
      />
    );
  }
  function sectionName(key, property, next) {
    onChange((current) => ({
      ...current,
      editorLabels: {
        ...current.editorLabels,
        sections: {
          ...current.editorLabels?.sections,
          [`contact.${key}`]: {
            ...current.editorLabels?.sections?.[`contact.${key}`],
            [property]: next,
          },
        },
      },
    }));
  }
  function section(index, children) {
    const [key, fallbackTitle, fallbackDescription] = sections[index];
    const custom = labels.sections?.[`contact.${key}`] || {};
    const title = custom.title ?? fallbackTitle;
    const description = custom.description ?? fallbackDescription;
    return (
      <section
        className="cms-card cms-page-section cms-contact-section"
        id={`contact-editor-${key}`}
        data-section={key}
        data-contact-section={key}
        aria-labelledby={`contact-editor-${key}-title`}
      >
        <div className="cms-card-header cms-page-section-header">
          <span className="cms-section-number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="cms-section-heading-copy">
            <h3 id={`contact-editor-${key}-title`}>{title}</h3>
            <p>{description}</p>
          </div>
          <details className="cms-section-name-editor">
            <summary>
              <PencilLine size={15} aria-hidden="true" /> ปรับชื่อส่วน
            </summary>
            <div>
              <p className="cms-hint">
                ชื่อส่วนนี้ใช้จัดหมวดในหลังบ้าน เนื้อหาที่แสดงบนเว็บไซต์แก้ในช่องด้านล่าง
              </p>
              <label>
                ชื่อส่วนในหลังบ้าน
                <input
                  aria-label={`ชื่อส่วนในหลังบ้าน ${fallbackTitle}`}
                  value={title}
                  maxLength={300}
                  onChange={(event) =>
                    sectionName(key, "title", event.target.value)
                  }
                />
              </label>
              <label>
                คำอธิบายส่วนในหลังบ้าน
                <input
                  aria-label={`คำอธิบายส่วนในหลังบ้าน ${fallbackTitle}`}
                  value={description}
                  maxLength={500}
                  onChange={(event) =>
                    sectionName(key, "description", event.target.value)
                  }
                />
              </label>
            </div>
          </details>
        </div>
        <div className="cms-card-body cms-contact-section-body">{children}</div>
      </section>
    );
  }
  function fixedIcon(slot, iconKey, label) {
    if (!availableIcons || !onIconsChange) return null;
    return (
      <details className="cms-contact-icon-settings">
        <summary>
          จัดการไอคอนของรายการนี้ <ChevronRight size={15} aria-hidden="true" />
        </summary>
        <InlineIconEditor
          slot={slot}
          iconKey={iconKey}
          label={label}
          icons={availableIcons}
          onChange={onIconsChange}
          defaults={defaults}
          scopeLabel={`มีผลเฉพาะรายการนี้ (${slot})`}
        />
      </details>
    );
  }
  function rowIcon(row, index) {
    const platform = getSocialPlatform(row.platform || row.icon);
    const current =
      row.iconStyle ||
      availableIcons?.overrides?.[`social.${index}`] ||
      availableIcons?.shared?.[row.icon] ||
      socialIconDefaults(platform?.id || row.icon);
    const initial = socialIconDefaults(platform?.id || row.icon);
    const slot = `contact.socials.${index}.iconStyle`;
    return (
      <details className="cms-contact-icon-settings">
        <summary>
          จัดการไอคอน สี และไฟล์ภาพ <ChevronRight size={15} aria-hidden="true" />
        </summary>
        <InlineIconEditor
          slot={slot}
          iconKey="__social"
          label={`ไอคอนช่องทาง ${index + 1}`}
          colorLabel={`ไอคอนช่องทาง ${index + 1}`}
          scopeLabel="ใช้เฉพาะช่องทางนี้ และย้ายตามรายการเมื่อจัดลำดับ"
          icons={{
            shared: { __social: current },
            overrides: { [slot]: current },
          }}
          defaults={{ overrides: { [slot]: initial } }}
          onChange={(next) =>
            onChange((contact) => ({
              ...contact,
              socials: contact.socials.map((item, i) =>
                i === index
                  ? {
                      ...item,
                      iconStyle: next.overrides[slot] || copy(initial),
                    }
                  : item,
              ),
            }))
          }
        />
      </details>
    );
  }
  function changePlatform(index, id) {
    const platform = getSocialPlatform(id);
    if (!platform) return;
    onChange((contact) => ({
      ...contact,
      socials: contact.socials.map((row, i) => {
        if (i !== index) return row;
        const old = getSocialPlatform(row.platform || row.icon);
        const standardName =
          (!row.name?.th && !row.name?.en) ||
          (old && row.name?.th === old.name.th && row.name?.en === old.name.en);
        return {
          ...row,
          platform: id,
          icon: id,
          iconStyle: socialIconDefaults(id),
          name: standardName ? { ...row.name, ...platform.name } : row.name,
        };
      }),
    }));
  }
  function moveSocial(index, offset) {
    onChange((contact) => {
      const socials = [...contact.socials];
      [socials[index], socials[index + offset]] = [
        socials[index + offset],
        socials[index],
      ];
      return { ...contact, socials };
    });
  }
  function removeSocial(index) {
    onChange((contact) => ({
      ...contact,
      socials: contact.socials.filter((_, i) => i !== index),
    }));
    setNotice(
      `นำช่องทาง ${index + 1} ออกจากแบบร่างแล้ว กดบันทึกเพื่อยืนยันการเปลี่ยนแปลง`,
    );
  }
  const known = new Set([
    "title",
    "subtitle",
    "heading",
    "formHeading",
    "emailLabel",
    "email",
    "phoneLabel",
    "hoursLabel",
    "hours",
    "closed",
    "socialHeading",
    "socials",
    "fields",
    "consent",
    "submit",
    "success",
    "pending",
    "invalid",
    "mapPending",
    "directions",
    "map",
    "editorLabels",
  ]);
  return (
    <EditorPageContext.Provider
      value={{
        page: "contact",
        labels,
        onLabelsChange: (next) =>
          onChange((current) => ({ ...current, editorLabels: next })),
        icons: availableIcons,
        defaultIcons: defaults,
        uploading: updating,
      }}
    >
      <EditorLanguageContext.Provider value={selectedLanguage}>
        <div className="cms-contact-editor">
          <nav className="cms-contact-outline" aria-label="ส่วนจัดการหน้าติดต่อเรา">
            {sections.map(([key, title], index) => (
              <a key={key} href={`#contact-editor-${key}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {labels.sections?.[`contact.${key}`]?.title || title}
              </a>
            ))}
          </nav>
          {section(
            0,
            <div className="cms-contact-intro-fields">
              {field("title")}
              {field("subtitle")}
            </div>,
          )}
          {section(
            1,
            <>
              {field("heading")}
              <div className="cms-contact-records">
                <article
                  className="cms-contact-record"
                  data-contact-record="email"
                >
                  <div className="cms-contact-record-heading">
                    <Icon name="mail" slot="contact.mail" />
                    <div>
                      <h4>อีเมลติดต่อ</h4>
                      <p>อีเมลที่ผู้เข้าชมใช้ติดต่อบริษัท</p>
                    </div>
                  </div>
                  <div className="cms-contact-field-pair">
                    {field("emailLabel")}
                    {field("email")}
                  </div>
                  {fixedIcon("contact.mail", "mail", "ไอคอนอีเมล")}
                </article>
                <article
                  className="cms-contact-record"
                  data-contact-record="phone"
                >
                  <div className="cms-contact-record-heading">
                    <Icon name="phone" slot="contact.phone" />
                    <div>
                      <h4>โทรศัพท์</h4>
                      <p>หมายเลขเดียวกับข้อมูลบริษัทและส่วนท้ายเว็บไซต์</p>
                    </div>
                  </div>
                  <div className="cms-contact-field-pair">
                    {field("phoneLabel")}
                    <div className="cms-contact-shared-value">
                      <span>หมายเลขโทรศัพท์บริษัท</span>
                      <strong>{company.phone || "ยังไม่ได้ระบุ"}</strong>
                      {onOpenCompany ? (
                        <button
                          type="button"
                          className="cms-text-button"
                          onClick={onOpenCompany}
                        >
                          แก้ไขในข้อมูลบริษัท
                        </button>
                      ) : (
                        <small>แก้ไขหมายเลขได้ที่ข้อมูลเว็บไซต์ → ข้อมูลบริษัท</small>
                      )}
                    </div>
                  </div>
                  {fixedIcon("contact.phone", "phone", "ไอคอนโทรศัพท์")}
                </article>
                <article
                  className="cms-contact-record"
                  data-contact-record="hours"
                >
                  <div className="cms-contact-record-heading">
                    <Icon name="clock" slot="contact.clock" />
                    <div>
                      <h4>เวลาทำการ</h4>
                      <p>วัน เวลา และข้อความแจ้งวันหยุด</p>
                    </div>
                  </div>
                  {field("hoursLabel")}
                  <div className="cms-contact-field-pair">
                    {field("hours")}
                    {field("closed")}
                  </div>
                  {fixedIcon("contact.clock", "clock", "ไอคอนเวลาทำการ")}
                </article>
              </div>
            </>,
          )}
          {section(
            2,
            <>
              {field("socialHeading")}
              <div className="cms-contact-social-add">
                <label>
                  แพลตฟอร์มโซเชียลมีเดีย
                  <select
                    aria-label="เลือกแพลตฟอร์มโซเชียลมีเดีย"
                    value={newPlatform}
                    onChange={(event) => setNewPlatform(event.target.value)}
                  >
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="cms-secondary"
                  disabled={updating || (value.socials || []).length >= 30}
                  onClick={() => {
                    update("socials", [
                      ...(value.socials || []),
                      createSocialChannel(newPlatform),
                    ]);
                    setNotice("เพิ่มช่องทางในแบบร่างแล้ว ระบุบัญชีและลิงก์จริงก่อนบันทึก");
                  }}
                >
                  <Plus size={16} aria-hidden="true" />
                  เพิ่มช่องทางโซเชียล
                </button>
              </div>
              <p className="cms-hint">
                เลือกแพลตฟอร์มแล้วเพิ่มรายการ ชื่อบัญชีและลิงก์ปลายทางต้องเป็นข้อมูลจริงของบริษัท
                ไอคอนแก้ไขแยกในแต่ละรายการ
              </p>
              <p className="cms-contact-notice" role="status">
                {notice}
              </p>
              <div className="cms-contact-social-list">
                {(value.socials || []).map((row, index) => {
                  const platform = getSocialPlatform(row.platform || row.icon);
                  const icon =
                    row.iconStyle ||
                    availableIcons?.overrides?.[`social.${index}`] ||
                    availableIcons?.shared?.[row.icon] ||
                    socialIconDefaults(row.platform || row.icon);
                  return (
                    <article
                      className="cms-contact-social-card"
                      key={index}
                      data-social-index={index}
                      aria-label={`ช่องทางโซเชียล ${index + 1}`}
                    >
                      <div className="cms-contact-social-heading">
                        <span className="cms-contact-social-preview">
                          <Icon
                            name={row.icon}
                            slot={`social.${index}`}
                            value={icon}
                          />
                        </span>
                        <div>
                          <h4>{platform?.label || "ช่องทางที่กำหนดเอง"}</h4>
                          <p>รายการ {index + 1} · ข้อมูลและไอคอนใช้เฉพาะรายการนี้</p>
                        </div>
                        <div className="cms-row-actions">
                          <button
                            type="button"
                            className="cms-secondary"
                            aria-label={`ย้ายช่องทาง ${index + 1} ขึ้น`}
                            disabled={updating || index === 0}
                            onClick={() => moveSocial(index, -1)}
                          >
                            <ArrowUp size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="cms-secondary"
                            aria-label={`ย้ายช่องทาง ${index + 1} ลง`}
                            disabled={
                              updating || index === value.socials.length - 1
                            }
                            onClick={() => moveSocial(index, 1)}
                          >
                            <ArrowDown size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="cms-danger"
                            aria-label={`ลบช่องทาง ${index + 1}`}
                            disabled={updating}
                            onClick={() => removeSocial(index)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                            ลบ
                          </button>
                        </div>
                      </div>
                      <label>
                        แพลตฟอร์ม
                        <select
                          aria-label={`แพลตฟอร์มของช่องทาง ${index + 1}`}
                          value={platform?.id || ""}
                          onChange={(event) =>
                            changePlatform(index, event.target.value)
                          }
                        >
                          {!platform && (
                            <option value="">กำหนดเอง / ไอคอนเดิม</option>
                          )}
                          {SOCIAL_PLATFORMS.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="cms-contact-field-pair">
                        <Field
                          path={`contact.socials.${index}.name`}
                          value={row.name}
                          media={media}
                          onChange={(name) =>
                            onChange((contact) => ({
                              ...contact,
                              socials: contact.socials.map((item, i) =>
                                i === index ? { ...item, name } : item,
                              ),
                            }))
                          }
                        />
                        <div>
                          <Field
                            path={`contact.socials.${index}.handle`}
                            value={row.handle}
                            media={media}
                            onChange={(handle) =>
                              onChange((contact) => ({
                                ...contact,
                                socials: contact.socials.map((item, i) =>
                                  i === index ? { ...item, handle } : item,
                                ),
                              }))
                            }
                          />
                          <Field
                            path={`contact.socials.${index}.href`}
                            value={row.href}
                            media={media}
                            onChange={(href) =>
                              onChange((contact) => ({
                                ...contact,
                                socials: contact.socials.map((item, i) =>
                                  i === index ? { ...item, href } : item,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                      {!row.href && (
                        <p className="cms-hint">
                          ยังไม่มีลิงก์บัญชี รายการจะแสดงข้อมูลบนเว็บไซต์
                          แต่ยังไม่เป็นลิงก์จนกว่าจะระบุปลายทาง
                        </p>
                      )}
                      {rowIcon(row, index)}
                    </article>
                  );
                })}
              </div>
            </>,
          )}
          {section(
            3,
            <>
              {field("formHeading")}
              <div className="cms-contact-subheading">
                <MessageSquare size={18} aria-hidden="true" />
                <div>
                  <h4>ช่องรับข้อมูล</h4>
                  <p>แก้ชื่อและข้อความตัวอย่างของแต่ละช่องแยกจากกัน</p>
                </div>
              </div>
              <div className="cms-contact-form-fields">
                {Object.entries(value.fields || {}).map(([key, settings]) => (
                  <article
                    className="cms-contact-form-field"
                    key={key}
                    data-form-field={key}
                  >
                    <div className="cms-contact-field-header">
                      <h4>{formFields[key] || key}</h4>
                      <span
                        className="cms-badge"
                        data-tone={
                          ["name", "email", "message"].includes(key)
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {["name", "email", "message"].includes(key)
                          ? "จำเป็นต้องกรอก"
                          : "ไม่บังคับ"}
                      </span>
                    </div>
                    <div className="cms-contact-field-pair">
                      {field(`fields.${key}.label`, settings.label, (label) =>
                        onChange((contact) => ({
                          ...contact,
                          fields: {
                            ...contact.fields,
                            [key]: { ...contact.fields[key], label },
                          },
                        })),
                      )}
                      {field(
                        `fields.${key}.placeholder`,
                        settings.placeholder,
                        (placeholder) =>
                          onChange((contact) => ({
                            ...contact,
                            fields: {
                              ...contact.fields,
                              [key]: { ...contact.fields[key], placeholder },
                            },
                          })),
                      )}
                    </div>
                    {Object.entries(settings)
                      .filter(
                        ([name]) => !["label", "placeholder"].includes(name),
                      )
                      .map(([name, item]) =>
                        field(`fields.${key}.${name}`, item, (next) =>
                          onChange((contact) => ({
                            ...contact,
                            fields: {
                              ...contact.fields,
                              [key]: { ...contact.fields[key], [name]: next },
                            },
                          })),
                        ),
                      )}
                  </article>
                ))}
              </div>
              <article
                className="cms-contact-record"
                data-contact-record="submit"
              >
                <div className="cms-contact-record-heading">
                  <Icon name="arrow" slot="contact.submit" />
                  <div>
                    <h4>ข้อตกลงและปุ่มส่งข้อความ</h4>
                    <p>ข้อความยินยอมและข้อความบนปุ่มที่ผู้เข้าชมกดส่ง</p>
                  </div>
                </div>
                {field("consent")}
                {field("submit")}
                {fixedIcon("contact.submit", "arrow", "ไอคอนปุ่มส่งข้อความ")}
              </article>
              <article
                className="cms-contact-record"
                data-contact-record="statuses"
              >
                <h4>ข้อความตอบกลับของระบบ</h4>
                <p className="cms-hint">
                  ใช้บอกผู้เข้าชมระหว่างส่ง เมื่อบันทึกสำเร็จ และเมื่อข้อมูลไม่ครบ
                </p>
                <div className="cms-contact-status-grid">
                  {["pending", "success", "invalid"].map((key) => (
                    <div
                      className="cms-contact-status-card"
                      key={key}
                      data-contact-status={key}
                    >
                      {field(key)}
                    </div>
                  ))}
                </div>
                <div
                  className="cms-contact-shared-value"
                  data-contact-shared="error"
                >
                  <span>ข้อความเมื่อระบบบันทึกไม่สำเร็จ · ใช้ร่วมกันทั้งเว็บไซต์</span>
                  <p>{sharedText(company.error)}</p>
                  {onOpenCompany ? (
                    <button
                      type="button"
                      className="cms-text-button"
                      onClick={onOpenCompany}
                    >
                      แก้ไขข้อความระบบส่วนกลาง
                    </button>
                  ) : (
                    <small>แก้ไขได้ในข้อมูลเว็บไซต์ → ข้อมูลบริษัทและข้อความระบบ</small>
                  )}
                </div>
              </article>
            </>,
          )}
          {section(
            4,
            <>
              <article
                className="cms-contact-record"
                data-contact-record="office"
              >
                <div className="cms-contact-record-heading">
                  <Icon name="building" slot="contact.office" />
                  <div>
                    <h4>ข้อมูลสำนักงาน</h4>
                    <p>ใช้ชื่อบริษัทและที่อยู่เดียวกับส่วนท้ายเว็บไซต์</p>
                  </div>
                </div>
                <div className="cms-contact-shared-value">
                  <span>{sharedText(company.addressHeading)}</span>
                  <strong>{sharedText(company.company)}</strong>
                  <p>{sharedText(company.address)}</p>
                  {onOpenCompany ? (
                    <button
                      type="button"
                      className="cms-text-button"
                      onClick={onOpenCompany}
                    >
                      แก้ไขข้อมูลบริษัทและที่อยู่
                    </button>
                  ) : (
                    <small>แก้ไขได้ในข้อมูลเว็บไซต์ → ข้อมูลบริษัท</small>
                  )}
                </div>
                {fixedIcon("contact.office", "building", "ไอคอนสำนักงาน")}
              </article>
              <article className="cms-contact-record" data-contact-record="map">
                <h4>แผนที่และลิงก์นำทาง</h4>
                <p className="cms-hint">
                  ระบุพิกัดที่ตรวจสอบแล้ว หมุดบนแผนที่แสดงจาก Google Maps ตามพิกัดที่ยืนยัน
                  ไม่ใช้ไอคอนในระบบเว็บไซต์
                </p>
                {field("map")}
                {field("directions")}
                {field("mapPending")}
              </article>
            </>,
          )}
          {Object.entries(value).some(([key]) => !known.has(key)) && (
            <section className="cms-card cms-contact-section">
              <div className="cms-card-header">
                <h3>ข้อมูลเพิ่มเติม</h3>
                <p>ข้อมูลที่เคยบันทึกไว้ยังคงอยู่และแก้ไขได้</p>
              </div>
              <div className="cms-card-body">
                {Object.entries(value)
                  .filter(([key]) => !known.has(key))
                  .map(([key]) => field(key))}
              </div>
            </section>
          )}
        </div>
      </EditorLanguageContext.Provider>
    </EditorPageContext.Provider>
  );
}
