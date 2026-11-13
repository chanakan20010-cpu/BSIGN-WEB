import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, CircleHelp } from "lucide-react";
import { AdminBrand } from "./AdminShell";
import "./admin.css";

function AuthStory() {
  return (
    <section className="cms-auth-story" aria-labelledby="cms-auth-story-title">
      <div className="cms-login-brand">
        <AdminBrand />
      </div>
      <div className="cms-auth-story-copy">
        <p className="cms-eyebrow">A WORKSPACE FOR YOUR NEXT CHAPTER</p>
        <h1 id="cms-auth-story-title">
          ดูแลทุกเรื่องราว
          <br />
          ให้เติบโตไปด้วยกัน
        </h1>
        <p className="cms-auth-intro">
          จัดการเนื้อหา ภาพ และข่าวสารของ BSIGN TECH
          <br className="cms-desktop-break" /> ให้พร้อมเชื่อมต่อกับทุกโอกาส
        </p>
        <div className="cms-login-rule" />
        <p className="cms-login-tagline">Built for your next update.</p>
      </div>
      <div className="cms-auth-story-footer">BSIGN TECH Co., Ltd.</div>
    </section>
  );
}

export function AdminAuthFrame({ title, description, children }) {
  return (
    <main lang="th" className="admin cms-auth">
      <div className="cms-auth-frame">
        <AuthStory />
        <section
          className="cms-auth-panel"
          aria-labelledby="cms-auth-action-title"
        >
          <Link to="/" className="cms-auth-back">
            <ArrowLeft size={16} aria-hidden="true" />
            กลับไปยังเว็บไซต์
          </Link>
          <div className="cms-auth-form-wrap">
            <div className="cms-auth-heading">
              <AdminBrand compact />
              <p className="cms-auth-welcome">WELCOME BACK</p>
              <h2 id="cms-auth-action-title">{title}</h2>
              <p className="cms-auth-description">{description}</p>
            </div>
            {children}
          </div>
          <p className="cms-auth-panel-footer">
            © {new Date().getFullYear()} BSIGN TECH Co., Ltd.
          </p>
        </section>
      </div>
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
      description="พื้นที่สำหรับผู้ดูแลเว็บไซต์ BSIGN TECH"
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
            placeholder="อีเมลผู้ดูแลระบบ"
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
              onKeyUp={(event) => setCaps(event.getModifierState("CapsLock"))}
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
            "เข้าสู่ระบบ"
          )}
        </button>
      </form>
      <div className="cms-auth-note">
        <CircleHelp size={19} aria-hidden="true" />
        <div>
          <p>
            เข้าใช้งานครั้งแรก? ใช้บัญชีที่สร้างไว้ในไฟล์ <code>initial-admin.txt</code>{" "}
            ของโปรเจกต์
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
