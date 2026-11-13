import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Image,
  KeyRound,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { AdminBrand } from "./AdminShell";
import "./admin.css";
function AuthStory() {
  return (
    <section className="cms-auth-story" aria-labelledby="cms-auth-story-title">
      <p className="cms-eyebrow">YOUR CONTENT. YOUR NEXT CHAPTER.</p>
      <h1 id="cms-auth-story-title">
        พื้นที่ของไอเดีย
        <br />
        ที่พร้อมเติบโต<span>.</span>
      </h1>
      <p className="cms-auth-intro">
        ทุกข้อความ ทุกภาพ และทุกเรื่องราวของ BSIGN TECH
        <br className="cms-desktop-break" /> จัดการได้อย่างเป็นระบบจากพื้นที่ทำงานเดียว
      </p>
      <div className="cms-auth-network" aria-hidden="true">
        <span className="cms-network-ring cms-network-ring-one" />
        <span className="cms-network-ring cms-network-ring-two" />
        <span className="cms-network-axis" />
        <span className="cms-network-axis cms-network-axis-two" />
        <span className="cms-network-core">
          B<span>BSIGN TECH</span>
        </span>
        <span className="cms-network-node cms-network-node-one">
          <FileText size={22} />
        </span>
        <span className="cms-network-node cms-network-node-two">
          <Image size={22} />
        </span>
        <span className="cms-network-node cms-network-node-three">
          <Layers3 size={22} />
        </span>
        <i className="cms-network-dot" />
      </div>
      <div className="cms-auth-story-footer">
        <span>01 — CONTENT WORKSPACE</span>
        <span>สร้างสรรค์ · จัดการ · เผยแพร่</span>
      </div>
    </section>
  );
}
export function AdminAuthFrame({ title, description, children }) {
  return (
    <main className="admin cms-auth">
      <header className="cms-auth-header">
        <AdminBrand />
        <Link to="/" className="cms-auth-back">
          <ArrowLeft size={16} aria-hidden="true" />
          กลับไปเว็บไซต์
        </Link>
      </header>
      <div className="cms-auth-frame">
        <AuthStory />
        <section
          className="cms-auth-panel"
          aria-labelledby="cms-auth-action-title"
        >
          <div className="cms-auth-form-wrap">
            <span className="cms-auth-lock" aria-hidden="true">
              <ShieldCheck size={25} strokeWidth={1.6} />
            </span>
            <p className="cms-auth-welcome">ยินดีต้อนรับกลับมา</p>
            <h2 id="cms-auth-action-title">{title}</h2>
            <p className="cms-auth-description">{description}</p>
            {children}
          </div>
          <p className="cms-auth-panel-footer">
            BSIGN TECH · พื้นที่สำหรับผู้ดูแลเว็บไซต์
          </p>
        </section>
      </div>
      <footer className="cms-auth-footer">
        <span>BSIGN TECH CONTENT MANAGEMENT</span>
        <span>จัดการอย่างชัดเจน พร้อมสำหรับทุกการเติบโต</span>
      </footer>
    </main>
  );
}
export default function AdminLogin({ busy, status, onSubmit }) {
  const [visible, setVisible] = useState(false),
    [caps, setCaps] = useState(false);
  const success = status?.startsWith("เปลี่ยนรหัสผ่านแล้ว");
  return (
    <AdminAuthFrame
      title="เข้าสู่ระบบจัดการเว็บไซต์"
      description="เข้าสู่พื้นที่ทำงานของคุณเพื่ออัปเดตเนื้อหาเว็บไซต์"
    >
      <form onSubmit={onSubmit} aria-busy={busy}>
        <label>
          อีเมล
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            maxLength={254}
            placeholder="อีเมลผู้ดูแลเว็บไซต์"
          />
        </label>
        <label>
          รหัสผ่าน
          <span className="cms-password-control">
            <input
              type={visible ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              maxLength={200}
              placeholder="กรอกรหัสผ่านของคุณ"
              onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
            />
            <button
              type="button"
              className="cms-password-toggle"
              aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? (
                <EyeOff size={19} aria-hidden="true" />
              ) : (
                <Eye size={19} aria-hidden="true" />
              )}
            </button>
          </span>
        </label>
        {caps && (
          <p className="cms-caps-note">
            เปิด Caps Lock อยู่ กรุณาตรวจตัวพิมพ์ของรหัสผ่าน
          </p>
        )}
        {status && (
          <p
            className="cms-status"
            data-tone={success ? "success" : "danger"}
            role={success ? "status" : "alert"}
          >
            {status}
          </p>
        )}
        <button
          className="cms-primary cms-login-submit"
          disabled={busy}
          type="submit"
        >
          {busy ? (
            <>
              <span className="cms-button-spinner" aria-hidden="true" />
              กำลังเข้าสู่ระบบ…
            </>
          ) : (
            <>
              เข้าสู่ระบบ
              <ArrowRight size={19} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
      <div className="cms-auth-note">
        <KeyRound size={18} aria-hidden="true" />
        <div>
          <b>ใช้งานครั้งแรก?</b>
          <p>
            ใช้ Username และ Password จากไฟล์ <code>initial-admin.txt</code>
          </p>
          <details>
            <summary>ดูวิธีค้นหาบัญชีผู้ดูแล</summary>
            <p>
              เปิดโฟลเดอร์โปรเจกต์ แล้วเปิด <code>.data/initial-admin.txt</code> ด้วย
              Notepad หากกำหนดโฟลเดอร์ข้อมูลเอง ให้ดูตำแหน่งที่ CMD แสดง
            </p>
            <p>
              หากเปลี่ยนรหัสผ่านแล้ว ให้ใช้รหัสใหม่ บัญชีจากรุ่นก่อนยังใช้อีเมลและรหัสเดิมได้
              หากจำไม่ได้ ให้หยุดพรีวิวแล้วเปิด <code>OPEN-PREVIEW.vbs</code> เพื่อกู้บัญชี
            </p>
          </details>
        </div>
      </div>
    </AdminAuthFrame>
  );
}
