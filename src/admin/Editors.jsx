import React, { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
  Type,
  Palette,
} from "lucide-react";
import { useSite, Site, Typography, Picture, Icon, iconNames } from "../shared";

const labels = {
  global: "ข้อมูลส่วนกลาง",
  home: "หน้าแรก",
  about: "เกี่ยวกับเรา",
  news: "หน้าข่าวสาร",
  contact: "ข้อมูลติดต่อ",
  cta: "ข้อความปุ่ม",
  title: "หัวข้อ",
  intro: "ข้อความแนะนำ",
  hero: "ภาพหลัก",
  ctaHref: "ลิงก์ปุ่ม",
  services: "แนะนำบริการ",
  cards: "การ์ดเนื้อหา",
  why: "เหตุผลที่เลือกเรา",
  advantages: "จุดเด่น",
  team: "ภาพทีมงาน",
  badge: "ป้ายกำกับ",
  badgeTitle: "หัวข้อป้ายกำกับ",
  heading: "หัวข้อของส่วน",
  eyebrow: "ข้อความเหนือหัวข้อ",
  description: "คำอธิบาย",
  body: "เนื้อหา",
  text: "ข้อความ",
  color: "สีตัวอักษร",
  url: "URL รูป",
  alt: "คำอธิบายภาพ",
  label: "ชื่อที่แสดง",
  href: "ลิงก์ปลายทาง",
  brand: "ชื่อแบรนด์",
  company: "ชื่อบริษัท",
  logo: "โลโก้ส่วนหัว",
  footerLogo: "โลโก้ส่วนท้าย",
  favicon: "ไอคอนแท็บเว็บไซต์ (URL)",
  nav: "เมนูนำทาง",
  email: "อีเมล",
  phone: "โทรศัพท์",
  address: "ที่อยู่",
  contactHeading: "หัวข้อช่องทางติดต่อ",
  addressHeading: "หัวข้อที่อยู่",
  languages: "ชื่อปุ่มภาษา",
  menuLabel: "ข้อความเปิดเมนู",
  skip: "ลิงก์ข้ามไปยังเนื้อหา",
  readMore: "ข้อความอ่านต่อ",
  search: "ข้อความค้นหา",
  all: "ข้อความแสดงทั้งหมด",
  previous: "ข้อความย้อนกลับ",
  next: "ข้อความถัดไป",
  empty: "ข้อความเมื่อไม่พบข้อมูล",
  loading: "ข้อความขณะโหลด",
  error: "ข้อความเมื่อเกิดข้อผิดพลาด",
  notFound: "ข้อความไม่พบหน้า",
  back: "ข้อความกลับหน้าข่าว",
  privacyLabel: "ชื่อหน้านโยบายความเป็นส่วนตัว",
  privacy: "เนื้อหานโยบายความเป็นส่วนตัว",
  size: "ขนาด Desktop (px)",
  tablet: "ขนาด Tablet (px)",
  mobile: "ขนาด Mobile (px)",
  weight: "น้ำหนักตัวอักษร",
  spacing: "ระยะตัวอักษร (px)",
  line: "ระยะบรรทัด (ตัวคูณ)",
  font: "ฟอนต์",
  background: "สีพื้นหลัง",
  name: "ชื่อ",
  asset: "ไฟล์ไอคอน",
  mode: "โหมดแสดงผล",
  confirmed: "ยืนยันพิกัดสำนักงานแล้ว",
  latitude: "ละติจูด",
  longitude: "ลองจิจูด",
  sourceUrl: "ลิงก์หมุดที่ยืนยันแล้ว",
  map: "ตำแหน่งบนแผนที่",
  th: "ไทย",
  en: "English",
  status: "สถานะการเผยแพร่",
  publishedAt: "วันและเวลาเผยแพร่",
  slug: "ชื่อ URL บทความ",
  category: "รหัสหมวดหมู่",
  gallery: "ภาพเพิ่มเติม",
  excerpt: "คำโปรย",
  image: "ภาพปกข่าว",
  pageSize: "จำนวนข่าวต่อหน้า",
  newsCategory: "รหัสหมวดข่าวที่แสดงหน้าแรก",
  matrix: "ชื่อชุดองค์ประกอบ",
  version: "ข้อความเวอร์ชัน",
  method: "ชื่อแนวทางการทำงาน",
  methodTitle: "หัวข้อแนวทางการทำงาน",
  stats: "ข้อมูลจุดเด่น",
  value: "ค่าที่แสดง",
  vision: "วิสัยทัศน์และพันธกิจ",
  missions: "รายการวิสัยทัศน์และพันธกิจ",
  quote: "ข้อความเน้น",
  values: "คุณค่าหลักขององค์กร",
  highlight: "ข้อความไฮไลต์",
  foot: "ข้อความท้ายการ์ด",
  articleTitleColor: "สีหัวข้อหน้ารายละเอียดข่าว",
  section: "ส่วนแนะนำข่าว",
  related: "หัวข้อข่าวที่เกี่ยวข้อง",
  latest: "หัวข้อข่าวล่าสุด",
  categories: "หมวดหมู่ข่าว",
  id: "รหัสอ้างอิง",
  primary: "ข้อความปุ่มหลัก",
  primaryHref: "ลิงก์ปุ่มหลัก",
  secondary: "ข้อความปุ่มรอง",
  secondaryHref: "ลิงก์ปุ่มรอง",
  subtitle: "คำอธิบายใต้หัวข้อ",
  formHeading: "หัวข้อแบบฟอร์ม",
  emailLabel: "ป้ายกำกับอีเมล",
  phoneLabel: "ป้ายกำกับโทรศัพท์",
  hoursLabel: "หัวข้อเวลาทำการ",
  hours: "เวลาทำการ",
  closed: "ข้อมูลวันหยุด",
  socialHeading: "หัวข้อโซเชียลมีเดีย",
  socials: "ช่องทางโซเชียลมีเดีย",
  handle: "ชื่อบัญชีที่แสดง",
  icon: "ชื่อไอคอน",
  fields: "ข้อความในแบบฟอร์ม",
  message: "ข้อความติดต่อ",
  placeholder: "ข้อความตัวอย่างในช่องกรอก",
  consent: "ข้อความขอความยินยอม",
  submit: "ข้อความปุ่มส่ง",
  success: "ข้อความเมื่อส่งสำเร็จ",
  pending: "ข้อความระหว่างส่ง",
  invalid: "ข้อความเมื่อกรอกข้อมูลไม่ครบ",
  mapPending: "ข้อความรอยืนยันพิกัด",
  directions: "ข้อความปุ่มนำทาง",
  lead: "ข้อความเปิดบทความ",
  secondaryBody: "เนื้อหาส่วนเพิ่มเติม",
  inlineImage: "ภาพประกอบในบทความ",
  heroImage: "ภาพส่วนหัวบทความ",
  headingStyle: "หัวข้อของส่วน",
  subheading: "หัวข้อรอง",
  inverse: "เนื้อหาบนพื้นเข้ม",
  menu: "เมนูนำทาง",
  button: "ปุ่ม",
  footer: "เนื้อหาส่วนท้าย",
  styles: "สไตล์ตัวอักษร",
  icons: "ไอคอน",
  shared: "รูปแบบไอคอนร่วมกัน",
  overrides: "ไอคอนเฉพาะตำแหน่ง",
};
export function fieldLabel(path = "") {
  const key = path.split(".").at(-1);
  if (/\.title\.\d+\.text$/.test(path)) return "ข้อความหัวข้อ";
  if (/^\d+$/.test(key)) return `รายการ ${Number(key) + 1}`;
  return labels[key] || key?.replace(/([a-z])([A-Z])/g, "$1 $2") || "เนื้อหา";
}
const clone = (value) => structuredClone(value);
const isBilingual = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof value.th === "string" &&
  typeof value.en === "string";
const longText = (path, value) =>
  /(?:body|intro|description|excerpt|quote|privacy|message|secondaryBody|lead)(?:\.(?:th|en))?$/.test(
    path,
  ) ||
  String(value).length > 100 ||
  String(value).includes("\n");
const numericLimits = {
  size: [10, 100, 1],
  tablet: [10, 100, 1],
  mobile: [10, 100, 1],
  weight: [100, 900, 100],
  spacing: [-4, 20, 0.1],
  line: [1, 3, 0.1],
  latitude: [-90, 90, "any"],
  longitude: [-180, 180, "any"],
  pageSize: [1, 30, 1],
};

function ColorField({
  value,
  onChange,
  label,
  path,
  disabled = false,
  hexLabel,
}) {
  return (
    <div className="cms-color-control">
      <label>
        {label}
        <input
          type="color"
          aria-label={label}
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </label>
      <label>
        HEX
        <input
          type="text"
          aria-label={hexLabel || `รหัส HEX ${path}`}
          value={value}
          maxLength={7}
          pattern="#[0-9a-fA-F]{6}"
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          spellCheck={false}
        />
      </label>
    </div>
  );
}
function TextControl({ value, onChange, path, label }) {
  // Keep the control type stable while typing so long text never drops focus.
  const heading =
    /(?:title|heading)(?:\.|$)/i.test(path) || /\.text\.(?:th|en)$/.test(path);
  const [multiline] = useState(() => heading || longText(path, value));
  return (
    <label>
      {label}
      {multiline ? (
        <textarea
          aria-label={label}
          value={value}
          rows={heading ? 2 : /body|privacy/.test(path) ? 7 : 4}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          value={value}
          type="text"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function emptyArrayItem(path) {
  const key = path.split(".").at(-1),
    bi = () => ({ th: "", en: "" }),
    image = () => ({ url: "", alt: bi(), crop: null });
  if (key === "title") return { text: bi(), color: "#000000" };
  if (key === "nav") return { label: bi(), href: "/" };
  if (key === "categories") return { id: "new-category", label: bi() };
  if (key === "socials")
    return { name: bi(), handle: "", href: "", icon: "line" };
  if (key === "stats") return { value: bi(), label: bi() };
  if (key === "missions") return { title: bi(), quote: bi(), body: bi() };
  if (key === "advantages") return { title: bi(), body: bi() };
  if (key === "cards")
    return path.startsWith("about.")
      ? { title: bi(), highlight: bi(), body: bi(), foot: bi() }
      : { eyebrow: bi(), title: bi(), body: bi() };
  return image();
}

export function Field({ value, onChange, path = "", media = [] }) {
  const key = path.split(".").at(-1),
    label = fieldLabel(path);
  if (isBilingual(value))
    return (
      <fieldset className="cms-field-group">
        <legend>{label}</legend>
        <div className="cms-languages">
          {[
            ["th", "ไทย"],
            ["en", "English"],
          ].map(([language, languageLabel]) => (
            <TextControl
              key={language}
              path={`${path}.${language}`}
              label={languageLabel}
              value={value[language]}
              onChange={(x) => onChange({ ...value, [language]: x })}
            />
          ))}
        </div>
        {Object.entries(value)
          .filter(([k]) => !["th", "en"].includes(k))
          .map(([k, v]) => (
            <Field
              key={k}
              path={`${path}.${k}`}
              value={v}
              onChange={(x) => onChange({ ...value, [k]: x })}
              media={media}
            />
          ))}
      </fieldset>
    );
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (isBilingual(value.text) && typeof value.color === "string")
      return (
        <div className="cms-title-line-layout">
          <Field
            path={`${path}.text`}
            value={value.text}
            media={media}
            onChange={(text) => onChange({ ...value, text })}
          />
          <ColorField
            path={`${path}.color`}
            label="สีหัวข้อบรรทัดนี้"
            hexLabel={`รหัส HEX หัวข้อบรรทัด ${Number(key) + 1}`}
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
          {Object.entries(value)
            .filter(([k]) => !["text", "color"].includes(k))
            .map(([k, v]) => (
              <Field
                key={k}
                path={`${path}.${k}`}
                value={v}
                media={media}
                onChange={(x) => onChange({ ...value, [k]: x })}
              />
            ))}
        </div>
      );
    if ("url" in value && "alt" in value)
      return (
        <fieldset className="cms-field-group cms-image-editor">
          <legend>{label}</legend>
          <div className="cms-field-grid">
            <Field
              value={value.url}
              path={`${path}.url`}
              onChange={(url) => onChange({ ...value, url, crop: null })}
            />
            <label>
              เลือกจากคลัง
              <select
                aria-label="เลือกจากคลัง"
                value=""
                onChange={(e) =>
                  e.target.value &&
                  onChange({ ...value, url: e.target.value, crop: null })
                }
              >
                <option value="">เลือกภาพที่อัปโหลดไว้…</option>
                {media.map((item) => (
                  <option key={item.id} value={item.url}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {value.url ? (
            <div className="cms-preview">
              <Picture value={value} />
            </div>
          ) : (
            <div className="cms-empty">
              <ImageIcon size={30} aria-hidden="true" />
              <p>ยังไม่ได้เลือกภาพ</p>
              <small>วาง URL หรือเลือกจากคลังภาพ</small>
            </div>
          )}
          <Field
            value={value.alt}
            path={`${path}.alt`}
            onChange={(alt) => onChange({ ...value, alt })}
            media={media}
          />
          {value.crop && (
            <p className="cms-muted">
              ภาพนี้ใช้ส่วนที่ตัดจากดีไซน์ต้นฉบับ เมื่อเปลี่ยนภาพจะแสดงไฟล์ใหม่เต็มภาพ
            </p>
          )}
          {Object.entries(value)
            .filter(([k]) => !["url", "alt", "crop"].includes(k))
            .map(([k, v]) => (
              <Field
                key={k}
                value={v}
                path={`${path}.${k}`}
                media={media}
                onChange={(x) => onChange({ ...value, [k]: x })}
              />
            ))}
        </fieldset>
      );
    return (
      <fieldset className="cms-field-group">
        <legend>{label}</legend>
        <div className="cms-field-grid">
          {Object.entries(value).map(([k, v]) => (
            <Field
              key={k}
              path={`${path}.${k}`}
              value={v}
              media={media}
              onChange={(x) => onChange({ ...value, [k]: x })}
            />
          ))}
        </div>
      </fieldset>
    );
  }
  if (Array.isArray(value)) {
    const move = (index, offset) => {
      const next = [...value];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      onChange(next);
    };
    return (
      <fieldset className="cms-field-group">
        <legend>{label}</legend>
        {value.length === 0 && (
          <p className="cms-muted">ยังไม่มีรายการ เพิ่มรายการแรกได้ด้านล่าง</p>
        )}
        {value.map((item, index) => (
          <div className="cms-array-item" key={index}>
            <div className="cms-array-header">
              <strong>
                {label} · {index + 1}
              </strong>
              <div className="cms-row-actions">
                <button
                  type="button"
                  className="cms-secondary"
                  aria-label={`ย้ายรายการ ${index + 1} ขึ้น`}
                  title="ย้ายขึ้น"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="cms-secondary"
                  aria-label={`ย้ายรายการ ${index + 1} ลง`}
                  title="ย้ายลง"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="cms-danger"
                  aria-label={`ลบรายการ ${index + 1}`}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  <span>ลบ</span>
                </button>
              </div>
            </div>
            <Field
              value={item}
              path={`${path}.${index}`}
              media={media}
              onChange={(x) =>
                onChange(value.map((old, i) => (i === index ? x : old)))
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="cms-secondary"
          onClick={() => {
            const next = clone(value[0] ?? emptyArrayItem(path));
            if (key === "categories") {
              let number = value.length + 1;
              while (value.some((item) => item.id === `category-${number}`))
                number++;
              next.id = `category-${number}`;
            }
            onChange([...value, next]);
          }}
        >
          <Plus size={16} aria-hidden="true" />
          เพิ่มรายการ
        </button>
      </fieldset>
    );
  }
  if (value === null && ["heroImage", "inlineImage"].includes(key))
    return (
      <fieldset className="cms-field-group">
        <legend>{label}</legend>
        <button
          type="button"
          className="cms-secondary"
          onClick={() =>
            onChange({ url: "", alt: { th: "", en: "" }, crop: null })
          }
        >
          <Plus size={16} aria-hidden="true" />
          เพิ่มภาพประกอบ
        </button>
      </fieldset>
    );
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean")
    return (
      <label className="check">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  if (key.toLowerCase().endsWith("color") || key === "background")
    return (
      <ColorField value={value} onChange={onChange} label={label} path={path} />
    );
  if (key === "font")
    return (
      <label>
        {label}
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {["Noto Sans Thai", "Noto Sans", "sans-serif", "serif"].map(
            (font) => (
              <option key={font}>{font}</option>
            ),
          )}
        </select>
      </label>
    );
  if (key === "status")
    return (
      <label>
        {label}
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="draft">ฉบับร่าง</option>
          <option value="published">เผยแพร่</option>
        </select>
      </label>
    );
  if (key === "publishedAt") {
    const date = new Date(value);
    const local = Number.isNaN(date.getTime())
      ? ""
      : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
    return (
      <label>
        {label}
        <input
          type="datetime-local"
          aria-label={label}
          value={local}
          onChange={(e) =>
            onChange(
              e.target.value ? new Date(e.target.value).toISOString() : "",
            )
          }
        />
        <small className="cms-muted">แสดงตามเวลาเครื่อง และบันทึกเป็น UTC</small>
      </label>
    );
  }
  if (typeof value === "number" || key in numericLimits) {
    const [min, max, step] = numericLimits[key] || [
      undefined,
      undefined,
      "any",
    ];
    return (
      <label>
        {label}
        <input
          type="number"
          aria-label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </label>
    );
  }
  return (
    <TextControl label={label} path={path} value={value} onChange={onChange} />
  );
}

const slots = [
  "section.marker",
  "home.services.marker",
  "home.why.marker",
  "news.section.marker",
  "about.vision.marker",
  "about.values.marker",
  ...Array.from({ length: 4 }, (_, i) => `about.foot.${i}`),
  "news.category",
  "news.latest",
  "news.search",
  "news.previous",
  "news.next",
  "header.menu",
  "footer.mail",
  "footer.phone",
  "footer.pin",
  "home.hero.arrow",
  "home.badge",
  ...Array.from({ length: 3 }, (_, i) => `home.service.${i}`),
  ...Array.from({ length: 3 }, (_, i) => `home.advantage.${i}`),
  "about.mission.0",
  "about.mission.1",
  ...Array.from({ length: 4 }, (_, i) => `about.value.${i}`),
  "cta.arrow",
  "news.card.arrow",
  "news.featured.arrow",
  "contact.mail",
  "contact.phone",
  "contact.clock",
  "contact.office",
  "contact.submit",
  "social.0",
  "social.1",
  "social.2",
];
const iconLabels = {
  marker: "สัญลักษณ์หัวข้อ",
  previous: "ย้อนกลับ",
  next: "ถัดไป",
  arrow: "ลูกศร",
  mail: "อีเมล",
  phone: "โทรศัพท์",
  clock: "เวลา",
  pin: "ตำแหน่ง",
  building: "อาคาร",
  terminal: "ซอฟต์แวร์และแพลตฟอร์ม",
  rocket: "การเติบโต",
  eye: "วิสัยทัศน์",
  speed: "ความรวดเร็ว",
  engineering: "วิศวกรรม",
  heart: "ความใส่ใจ",
  brain: "นวัตกรรม",
  bolt: "พลังงาน",
  menu: "เมนู",
  facebook: "Facebook",
  line: "LINE",
  linkedin: "LinkedIn",
};
function slotLabel(key) {
  const exact = {
    "section.marker": "สัญลักษณ์หัวข้อร่วมกัน",
    "home.services.marker": "หน้าแรก · หัวข้อบริการ",
    "home.why.marker": "หน้าแรก · หัวข้อจุดเด่น",
    "news.section.marker": "ข่าวสาร · หัวข้อข่าว",
    "about.vision.marker": "เกี่ยวกับเรา · หัวข้อวิสัยทัศน์",
    "about.values.marker": "เกี่ยวกับเรา · หัวข้อคุณค่าหลัก",
    "news.category": "ข่าวสาร · หมวดหมู่",
    "news.latest": "ข่าวสาร · ข่าวล่าสุด",
    "news.search": "ข่าวสาร · ค้นหา",
    "news.previous": "ข่าวสาร · หน้าก่อน",
    "news.next": "ข่าวสาร · หน้าถัดไป",
    "header.menu": "ส่วนหัว · เมนูมือถือ",
    "footer.mail": "ส่วนท้าย · อีเมล",
    "footer.phone": "ส่วนท้าย · โทรศัพท์",
    "footer.pin": "ส่วนท้าย · ที่อยู่",
    "home.hero.arrow": "หน้าแรก · ปุ่มหลัก",
    "home.badge": "หน้าแรก · ป้ายกำกับ",
    "cta.arrow": "แบนเนอร์ติดต่อ · ลูกศร",
    "news.card.arrow": "การ์ดข่าว · ลูกศร",
    "news.featured.arrow": "ข่าวเด่น · ลูกศร",
    "contact.mail": "ติดต่อเรา · อีเมล",
    "contact.phone": "ติดต่อเรา · โทรศัพท์",
    "contact.clock": "ติดต่อเรา · เวลาทำการ",
    "contact.office": "ติดต่อเรา · สำนักงาน",
    "contact.submit": "ติดต่อเรา · ส่งข้อความ",
  };
  if (exact[key]) return exact[key];
  const groups = {
      "home.service": "หน้าแรก · บริการ",
      "home.advantage": "หน้าแรก · จุดเด่น",
      "about.mission": "เกี่ยวกับเรา · วิสัยทัศน์/พันธกิจ",
      "about.value": "เกี่ยวกับเรา · คุณค่าหลัก",
      "about.foot": "เกี่ยวกับเรา · ท้ายการ์ด",
      social: "โซเชียลมีเดีย",
    },
    index = Number(key.split(".").at(-1)),
    group = key.split(".").slice(0, -1).join(".");
  return groups[group] && Number.isFinite(index)
    ? `${groups[group]} ${index + 1}`
    : key;
}
export function IconEditor({ value, onChange, media = [], defaults }) {
  const [scope, setScope] = useState("shared"),
    [key, setKey] = useState("arrow");
  const site = useSite();
  const slotBase = (slot) => {
    if (
      slot.includes("marker") ||
      slot.startsWith("about.foot.") ||
      ["news.category", "news.latest"].includes(slot)
    )
      return "marker";
    if (slot.startsWith("home.service.")) return "terminal";
    if (slot.startsWith("home.advantage.")) return "rocket";
    if (slot.startsWith("about.value."))
      return ["speed", "engineering", "heart", "brain"][
        Number(slot.split(".").at(-1)) % 4
      ];
    if (slot.startsWith("about.mission."))
      return Number(slot.split(".").at(-1)) ? "rocket" : "eye";
    if (slot.startsWith("social."))
      return (
        site.content.contact.socials[Number(slot.split(".").at(-1))]?.icon ||
        "arrow"
      );
    return (
      {
        "header.menu": "menu",
        "home.badge": "bolt",
        "contact.office": "building",
        "contact.submit": "arrow",
      }[slot] ||
      (Object.hasOwn(value.shared, slot.split(".").at(-1))
        ? slot.split(".").at(-1)
        : "arrow")
    );
  };
  const availableSlots = [
    ...new Set([
      ...slots,
      ...Object.keys(value.overrides),
      ...site.content.home.cards.map((_, i) => `home.service.${i}`),
      ...site.content.home.advantages.map((_, i) => `home.advantage.${i}`),
      ...site.content.about.cards.flatMap((_, i) => [
        `about.value.${i}`,
        `about.foot.${i}`,
      ]),
      ...site.content.about.missions.map((_, i) => `about.mission.${i}`),
      ...site.content.contact.socials.map((_, i) => `social.${i}`),
    ]),
  ];
  const current =
    value[scope][key] ||
    clone(value.shared[slotBase(key)] || value.shared.arrow);
  const update = (patch) =>
    onChange({
      ...value,
      [scope]: { ...value[scope], [key]: { ...current, ...patch } },
    });
  const raster = current.asset !== "" && !current.asset.endsWith(".svg");
  return (
    <div className="cms-editor-layout">
      <section className="cms-card">
        <div className="cms-card-header">
          <Palette size={20} aria-hidden="true" />
          <div>
            <h3>เลือกไอคอนและตำแหน่ง</h3>
            <p className="cms-muted">กำหนดว่าการเปลี่ยนแปลงนี้มีผลกับส่วนใดของเว็บไซต์</p>
          </div>
        </div>
        <div className="cms-card-body">
          <div className="cms-field-grid">
            <label>
              ขอบเขต
              <select
                aria-label="ขอบเขต"
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setKey(e.target.value === "shared" ? "arrow" : "header.menu");
                }}
              >
                <option value="shared">ทุกตำแหน่งที่ใช้ร่วมกัน</option>
                <option value="overrides">เฉพาะจุด</option>
              </select>
            </label>
            <label>
              ตำแหน่ง
              <select
                aria-label="ตำแหน่ง"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              >
                {(scope === "shared"
                  ? Object.keys(value.shared)
                  : availableSlots
                ).map((slot) => (
                  <option key={slot} value={slot}>
                    {scope === "shared"
                      ? iconLabels[slot] || slot
                      : slotLabel(slot)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="cms-muted">
            {scope === "shared"
              ? "มีผลกับทุกตำแหน่งที่อ้างอิงไอคอนชนิดนี้"
              : "มีผลเฉพาะตำแหน่งนี้ ส่วนอื่นยังใช้รูปแบบร่วมกัน"}{" "}
            <small>({key})</small>
          </p>
          <label>
            คลังไอคอน
            <select
              aria-label="คลังไอคอน"
              value={current.name}
              onChange={(e) => update({ name: e.target.value, asset: "" })}
            >
              {iconNames.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <div
            className="cms-icon-library"
            role="group"
            aria-label="ตัวเลือกไอคอนแบบภาพ"
          >
            {iconNames.map((name) => (
              <button
                type="button"
                key={name}
                className="cms-secondary"
                aria-label={`เลือกไอคอน ${name}`}
                aria-pressed={current.name === name && !current.asset}
                onClick={() => update({ name, asset: "" })}
              >
                <Site.Provider
                  value={{
                    ...site,
                    content: {
                      ...site.content,
                      icons: {
                        shared: { __choice: { ...current, name, asset: "" } },
                        overrides: {},
                      },
                    },
                  }}
                >
                  <Icon name="__choice" />
                </Site.Provider>
                <small>{name}</small>
              </button>
            ))}
          </div>
          <label>
            ไฟล์จากคลัง
            <select
              aria-label="ไฟล์จากคลัง"
              value={current.asset}
              onChange={(e) =>
                update({
                  asset: e.target.value,
                  mode: e.target.value.endsWith(".svg") ? "mask" : "image",
                })
              }
            >
              <option value="">ใช้ไอคอนสำเร็จรูป</option>
              {media.map((item) => (
                <option key={item.id} value={item.url}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="cms-field-grid">
            <ColorField
              label="สีไอคอน (SVG / ไอคอนสำเร็จรูป)"
              hexLabel="รหัสสีไอคอน HEX"
              path="icon.color"
              value={current.color}
              onChange={(color) => update({ color })}
              disabled={raster}
            />
            <ColorField
              label="พื้นหลัง"
              hexLabel="รหัสพื้นหลัง HEX"
              path="icon.background"
              value={current.background}
              onChange={(background) => update({ background })}
            />
          </div>
          {current.asset.endsWith(".svg") && (
            <label>
              การแสดง SVG
              <select
                aria-label="การแสดง SVG"
                value={current.mode}
                onChange={(e) => update({ mode: e.target.value })}
              >
                <option value="mask">ใช้สีเดียวตามการตั้งค่า</option>
                <option value="image">ใช้สีต้นฉบับ</option>
              </select>
            </label>
          )}
          <button
            type="button"
            className="cms-secondary"
            disabled={scope === "shared" && !defaults.shared[key]}
            onClick={() =>
              onChange({
                ...value,
                [scope]: {
                  ...value[scope],
                  [key]:
                    scope === "shared" ? clone(defaults.shared[key]) : null,
                },
              })
            }
          >
            <RotateCcw size={16} aria-hidden="true" />
            คืนค่าไอคอนนี้
          </button>
        </div>
      </section>
      <section className="cms-card cms-preview">
        <div className="cms-card-header">
          <h3>ตัวอย่างไอคอน</h3>
          <span className="cms-badge">ก่อนบันทึก</span>
        </div>
        <div className="cms-card-body">
          <div className="cms-icon-sample">
            <Site.Provider
              value={{ ...site, content: { ...site.content, icons: value } }}
            >
              <Icon
                name={scope === "shared" ? key : slotBase(key)}
                slot={scope === "overrides" ? key : "__preview"}
              />
            </Site.Provider>
          </div>
          <p>
            <strong>
              {scope === "shared" ? iconLabels[key] || key : slotLabel(key)}
            </strong>
          </p>
          <p className="cms-muted">
            ภาพ PNG/JPEG/WebP ใช้สีต้นฉบับ เปลี่ยนสีได้เฉพาะพื้นหลัง ส่วน SVG
            แบบสีเดียวเปลี่ยนสีตัวไอคอนได้
          </p>
          <p className="cms-muted">
            ไอคอนของ Google Maps และเบราว์เซอร์อยู่นอกการควบคุมของเว็บไซต์
          </p>
        </div>
      </section>
    </div>
  );
}

const styleKinds = {
  brand: ["ชื่อแบรนด์", "ชื่อแบรนด์ในส่วนหัวเว็บไซต์"],
  hero: ["หัวข้อใหญ่", "หัวข้อหลักแต่ละหน้า ใช้ขนาดและฟอนต์ร่วมกัน"],
  heading: ["หัวข้อของส่วน", "หัวข้อหลักภายในหน้าเว็บไซต์"],
  subheading: ["หัวข้อรอง", "หัวข้อการ์ดและหัวข้อย่อย"],
  body: ["เนื้อหา", "ข้อความทั่วไปและเนื้อหาบทความ"],
  inverse: ["เนื้อหาบนพื้นเข้ม", "เนื้อหาในส่วนที่ใช้พื้นหลังเข้ม"],
  intro: ["ข้อความแนะนำ", "ข้อความแนะนำใต้หัวข้อหลัก"],
  highlight: ["ข้อความไฮไลต์", "ข้อความเน้นและคำโปรยเหนือหัวข้อ"],
  menu: ["เมนู", "รายการเมนูนำทางเว็บไซต์"],
  button: ["ปุ่ม", "ข้อความในปุ่มและลิงก์ดำเนินการ"],
  label: ["ป้ายกำกับ", "ป้ายชื่อ หมวดหมู่ และช่องแบบฟอร์ม"],
  footer: ["ส่วนท้าย", "ข้อความบริเวณส่วนท้ายเว็บไซต์"],
};
export function StyleEditor({ value, onChange }) {
  const [selected, setSelected] = useState("hero"),
    [language, setLanguage] = useState("th"),
    [viewport, setViewport] = useState("size");
  const kind = value[selected] ? selected : Object.keys(value)[0],
    current = value[kind],
    [title, description] = styleKinds[kind] || [
      fieldLabel(kind),
      "รูปแบบตัวอักษรส่วนกลาง",
    ];
  const previewStyles = Object.fromEntries(
    Object.entries(value).map(([key, style]) => [
      key,
      {
        ...style,
        size: style[viewport],
        tablet: style[viewport],
        mobile: style[viewport],
      },
    ]),
  );
  return (
    <>
      <div className="cms-style-kinds" role="group" aria-label="ชนิดตัวอักษร">
        {Object.keys(value).map((key) => (
          <button
            key={key}
            type="button"
            className={key === kind ? "cms-primary" : "cms-secondary"}
            aria-pressed={key === kind}
            onClick={() => setSelected(key)}
          >
            {styleKinds[key]?.[0] || fieldLabel(key)}
          </button>
        ))}
      </div>
      <div className="cms-editor-layout">
        <section className="cms-card">
          <div className="cms-card-header">
            <Type size={20} aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p className="cms-muted">{description}</p>
            </div>
          </div>
          <div className="cms-card-body">
            <div className="cms-field-grid">
              {Object.entries(current).map(([key, setting]) => (
                <Field
                  key={key}
                  path={`${kind}.${key}`}
                  value={setting}
                  onChange={(x) =>
                    onChange({ ...value, [kind]: { ...current, [key]: x } })
                  }
                />
              ))}
            </div>
            <p className="cms-muted">
              ใช้สไตล์เดียวกันทั้งภาษาไทยและอังกฤษ ขนาด Tablet/Mobile จะเปลี่ยนตามหน้าจอ
              สีหัวข้อใหญ่แต่ละบรรทัดปรับได้ในหน้าเนื้อหา
            </p>
          </div>
        </section>
        <section className="cms-card cms-preview">
          <div className="cms-card-header">
            <h3>ตัวอย่างก่อนบันทึก</h3>
            <span className="cms-badge">{title}</span>
          </div>
          <div className="cms-card-body">
            <div className="cms-preview-controls">
              <label>
                ภาษาตัวอย่าง
                <select
                  aria-label="ภาษาตัวอย่าง"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="th">ไทย</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label>
                ขนาดหน้าจอตัวอย่าง
                <select
                  aria-label="ขนาดหน้าจอตัวอย่าง"
                  value={viewport}
                  onChange={(e) => setViewport(e.target.value)}
                >
                  <option value="size">Desktop</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobile">Mobile</option>
                </select>
              </label>
            </div>
            <div
              data-tone={
                ["inverse", "footer"].includes(kind) ? "dark" : "light"
              }
              className="cms-type-sample"
            >
              <Typography styles={previewStyles}>
                <p className={`type-${kind}`}>
                  {language === "th" ? (
                    <>
                      ออกแบบอนาคต
                      <br />
                      ให้ธุรกิจเติบโต
                    </>
                  ) : (
                    <>
                      Engineer the future.
                      <br />
                      Build what’s next.
                    </>
                  )}
                </p>
                <p className={`type-${kind}`}>
                  {language === "th"
                    ? "สถาปัตยกรรมดิจิทัลและวิศวกรรมอัจฉริยะ เชื่อมเทคโนโลยีกับเป้าหมายขององค์กร"
                    : "Digital architecture and intelligent engineering, connecting technology with your business goals."}
                </p>
              </Typography>
            </div>
            <p className="cms-muted">
              {current[viewport]} px · น้ำหนัก {current.weight} · ระยะตัวอักษร{" "}
              {current.spacing} px · ระยะบรรทัด {current.line} เท่า
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
