import React, { useState } from "react";
import { Image, Monitor, ShieldCheck, Type } from "lucide-react";
import { AdminBrand } from "./AdminShell";
import AdminLogin from "./AdminLogin";
import {
  adminPresentationDefaults,
  requiredAdminPresentationFields,
  sanitizePublicAdminPresentation,
  renderAdminPresentationText,
} from "../../server/admin-presentation-defaults";
import "./admin-presentation.css";

const requiredFields = new Set(requiredAdminPresentationFields);
const groups = [
  {
    key: "workspace",
    title: "แบรนด์และพื้นที่จัดการ",
    icon: Monitor,
    description: "ใช้โลโก้ ชื่อแบรนด์ และชื่อบริษัทจากข้อมูลเว็บไซต์ร่วมกัน",
    fields: [
      ["sidebarCaption", "ข้อความใต้ชื่อแบรนด์"],
      ["workspaceHeading", "ชื่อพื้นที่จัดการ"],
      ["workspaceEyebrow", "ข้อความเหนือหัวข้อในพื้นที่จัดการ"],
      ["workspaceFooter", "ข้อความท้ายพื้นที่จัดการ"],
      ["workspaceFooterNote", "คำอธิบายท้ายพื้นที่จัดการ"],
    ],
  },
  {
    key: "story",
    title: "ข้อความต้อนรับ",
    icon: Type,
    description: "ข้อความแนะนำด้านซ้ายของหน้าเข้าสู่ระบบ รองรับการขึ้นบรรทัดใหม่",
    fields: [
      ["storyEyebrow", "ข้อความเหนือหัวข้อต้อนรับ"],
      ["storyTitle", "หัวข้อต้อนรับ", true],
      ["storyIntro", "คำแนะนำต้อนรับ", true],
      ["storyTagline", "ข้อความสั้นใต้เส้นคั่น"],
      ["storyFooter", "ข้อความท้ายส่วนต้อนรับ"],
    ],
  },
  {
    key: "form",
    title: "แบบฟอร์มเข้าสู่ระบบ",
    icon: ShieldCheck,
    description: "หัวข้อ ป้ายช่องกรอก และข้อความปุ่มที่ผู้ดูแลเห็นก่อนเข้าสู่ระบบ",
    fields: [
      ["welcome", "ข้อความเหนือหัวข้อเข้าสู่ระบบ"],
      ["title", "หัวข้อเข้าสู่ระบบ"],
      ["description", "คำอธิบายใต้หัวข้อ", true],
      ["backLabel", "ข้อความลิงก์กลับเว็บไซต์"],
      ["emailLabel", "ชื่อช่องอีเมล"],
      ["emailPlaceholder", "คำแนะนำในช่องอีเมล"],
      ["passwordLabel", "ชื่อช่องรหัสผ่าน"],
      ["passwordPlaceholder", "คำแนะนำในช่องรหัสผ่าน"],
      ["showPasswordLabel", "คำอธิบายปุ่มแสดงรหัสผ่าน"],
      ["hidePasswordLabel", "คำอธิบายปุ่มซ่อนรหัสผ่าน"],
      ["submitLabel", "ข้อความปุ่มเข้าสู่ระบบ"],
      ["pendingLabel", "ข้อความขณะกำลังเข้าสู่ระบบ"],
      ["copyright", "ลิขสิทธิ์ท้ายหน้า"],
    ],
  },
  {
    key: "help",
    title: "คำแนะนำการใช้งาน",
    icon: Type,
    description: "ข้อความช่วยเหลือสำหรับผู้ดูแลและคำเตือนเกี่ยวกับการกรอกรหัสผ่าน",
    fields: [
      ["helpTitle", "คำแนะนำการใช้งานครั้งแรก", true],
      ["helpSummary", "หัวข้อเปิดคำแนะนำเพิ่มเติม"],
      ["helpInstructions", "วิธีค้นหาบัญชีผู้ดูแล", true],
      ["helpRecovery", "คำแนะนำการกู้บัญชี", true],
      ["capsLock", "ข้อความเตือน Caps Lock", true],
    ],
  },
  {
    key: "status",
    title: "ข้อความแจ้งผล",
    icon: ShieldCheck,
    description: "ข้อความที่แสดงเมื่อเข้าสู่ระบบไม่สำเร็จหรือจำเป็นต้องเข้าสู่ระบบใหม่",
    fields: [
      ["invalidCredentials", "อีเมลหรือรหัสผ่านไม่ถูกต้อง", true],
      ["rateLimited", "ใช้งานถี่เกินไป", true],
      ["validationError", "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง", true],
      ["sessionExpired", "การเข้าสู่ระบบหมดอายุ", true],
      ["genericError", "ข้อผิดพลาดทั่วไป", true],
      ["passwordChanged", "เปลี่ยนรหัสผ่านแล้ว", true],
    ],
  },
];

export default function AdminPresentationEditor({
  value,
  onChange,
  global = {},
  media,
}) {
  const presentation = sanitizePublicAdminPresentation(value);
  const [previewState, setPreviewState] = useState("normal");
  const update = (key, next) =>
    onChange({ ...adminPresentationDefaults, ...value, [key]: next });
  const text = (key) => renderAdminPresentationText(presentation[key], global);
  return (
    <div className="cms-presentation-editor">
      <section className="cms-card cms-presentation-guidance">
        <div className="cms-card-body">
          <div className="cms-presentation-identity">
            <AdminBrand global={global} presentation={presentation} />
            <p>
              <Image size={18} aria-hidden="true" /> เปลี่ยนโลโก้ใน “ส่วนหัวเว็บไซต์”
              และเปลี่ยนชื่อแบรนด์หรือบริษัทใน “ข้อมูลเว็บไซต์”
            </p>
          </div>
          <p className="cms-hint">
            ใช้ข้อความแทนค่า <code>{"{brand}"}</code> ชื่อแบรนด์ ·{" "}
            <code>{"{company}"}</code> ชื่อบริษัท · <code>{"{companyEn}"}</code>{" "}
            ชื่อบริษัทภาษาอังกฤษ · <code>{"{year}"}</code> ปีปัจจุบัน
          </p>
          <p className="cms-hint">
            ข้อความใช้ร่วมกันในหน้าเข้าสู่ระบบภาษาไทย ช่องที่มี * จำเป็นต้องมีข้อความ
          </p>
        </div>
      </section>
      <section className="cms-card cms-presentation-preview-card">
        <div className="cms-card-header">
          <div>
            <h3>ตัวอย่างหน้าเข้าสู่ระบบ</h3>
            <p>ตัวอย่างอัปเดตตามแบบร่าง กดบันทึกการเปลี่ยนแปลงเพื่อใช้งานจริง</p>
          </div>
          <div
            className="cms-presentation-preview-options"
            role="group"
            aria-label="สถานะที่แสดงในตัวอย่าง"
          >
            {[
              ["normal", "ปกติ"],
              ["error", "ข้อผิดพลาด"],
              ["pending", "กำลังเข้าสู่ระบบ"],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-pressed={previewState === key}
                onClick={() => setPreviewState(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="cms-login-preview" inert aria-hidden="true">
          <AdminLogin
            preview
            global={global}
            presentation={presentation}
            busy={previewState === "pending"}
            status={previewState === "error" ? "INVALID_CREDENTIALS" : ""}
            onSubmit={(event) => event.preventDefault()}
          />
        </div>
        <div className="cms-presentation-workspace-preview">
          <span>{text("workspaceEyebrow")}</span>
          <strong>{text("workspaceHeading")}</strong>
          <small>
            {text("workspaceFooter")} · {text("workspaceFooterNote")}
          </small>
        </div>
      </section>
      <div className="cms-presentation-groups">
        {groups.map(
          ({ key, title, icon: Glyph, description, fields }, index) => (
            <section
              className="cms-card"
              key={key}
              data-presentation-group={key}
            >
              <div className="cms-card-header">
                <div className="cms-presentation-group-heading">
                  <Glyph size={21} aria-hidden="true" />
                  <div>
                    <h3>
                      {String(index + 1).padStart(2, "0")} · {title}
                    </h3>
                    <p>{description}</p>
                  </div>
                </div>
              </div>
              <div className="cms-card-body cms-field-grid">
                {fields.map(([field, label, multiline]) => {
                  const Input = multiline ? "textarea" : "input";
                  return (
                    <label
                      key={field}
                      data-field-path={`adminPresentation.${field}`}
                    >
                      <span>
                        {label}
                        {requiredFields.has(field) ? " *" : ""}
                      </span>
                      <Input
                        value={
                          value?.[field] ?? adminPresentationDefaults[field]
                        }
                        maxLength={5000}
                        rows={multiline ? 3 : undefined}
                        required={requiredFields.has(field)}
                        aria-required={requiredFields.has(field) || undefined}
                        onChange={(event) => update(field, event.target.value)}
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
