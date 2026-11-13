import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Database,
  FileText,
  Globe2,
  House,
  Image,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Palette,
  PanelTop,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import "./admin.css";
const groups = [
  { label: "พื้นที่ทำงาน", items: [["dashboard", "ภาพรวม", LayoutDashboard]] },
  {
    label: "เนื้อหาเว็บไซต์",
    items: [
      ["home", "หน้าแรก", House],
      ["about", "เกี่ยวกับเรา", LayoutTemplate],
      ["news", "ข่าวสาร / หมวดหมู่", FileText],
      ["contact", "ติดต่อเรา / ฟอร์ม / แผนที่", Globe2],
      ["global", "ส่วนกลาง / เมนู / บริษัท", Settings2],
      ["cta", "แบนเนอร์ติดต่อ", PanelTop],
    ],
  },
  {
    label: "คลังคอนเทนต์",
    items: [
      ["articles", "จัดการบทความ", FileText],
      ["media", "รูปภาพและไฟล์", Image],
    ],
  },
  {
    label: "ภาพลักษณ์แบรนด์",
    items: [
      ["styles", "สไตล์ตัวอักษร", Palette],
      ["icons", "ไอคอน", Sparkles],
    ],
  },
  {
    label: "ดูแลและตั้งค่า",
    items: [
      ["contacts", "ข้อความติดต่อ", Inbox],
      ["subscribers", "ผู้สมัครรับข่าวสาร", Users],
      ["password", "เปลี่ยนรหัสผ่าน", ShieldCheck],
      ["system", "ข้อมูลระบบ", Database],
    ],
  },
];
export function AdminBrand() {
  return (
    <span className="cms-brand">
      <span className="cms-brand-mark" aria-hidden="true">
        B<span />
      </span>
      <span className="cms-brand-wordmark">
        <b>
          BSIGN<span>TECH</span>
        </b>
        <small>CONTENT WORKSPACE</small>
      </span>
    </span>
  );
}
export default function AdminShell({
  tab,
  title,
  description,
  counts = {},
  search = "",
  onSearch,
  onNavigate,
  onLogout,
  loading = false,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 900px)").matches,
  );
  const sidebar = useRef(null),
    close = useRef(null),
    heading = useRef(null),
    previousTab = useRef(tab);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const changed = () => {
      setMobile(query.matches);
      if (!query.matches) setOpen(false);
    };
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (previousTab.current !== tab) {
      previousTab.current = tab;
      requestAnimationFrame(() =>
        heading.current?.focus({ preventScroll: true }),
      );
    }
  }, [tab]);
  useEffect(() => {
    if (!open || !mobile) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const keydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const elements = [
        ...sidebar.current.querySelectorAll(
          "button:not(:disabled), input, a[href]",
        ),
      ].filter((el) => el.offsetParent !== null && el.tabIndex >= 0);
      const first = elements[0],
        last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, mobile]);
  function navigate(key) {
    if (onNavigate(key) !== false) setOpen(false);
  }
  const query = search.trim().toLowerCase();
  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(([k, l]) => (k + l).toLowerCase().includes(query)),
    }))
    .filter((g) => g.items.length);
  return (
    <div className={`admin cms${open ? " cms-menu-open" : ""}`}>
      {mobile && open && (
        <button
          type="button"
          className="cms-backdrop"
          tabIndex={-1}
          aria-label="ปิดพื้นที่เมนู"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className="cms-sidebar"
        id="cms-navigation"
        ref={sidebar}
        role={mobile && open ? "dialog" : undefined}
        aria-modal={mobile && open ? true : undefined}
        aria-label="เมนูจัดการเว็บไซต์"
        inert={mobile && !open ? true : undefined}
      >
        <div className="cms-sidebar-heading">
          <AdminBrand />
          <button
            type="button"
            className="cms-mobile-close cms-icon-button"
            ref={close}
            onClick={() => setOpen(false)}
            aria-label="ปิดเมนูจัดการ"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <label className="cms-nav-search">
          <Search size={16} aria-hidden="true" />
          <span className="cms-sr-only">ค้นหาหมวด</span>
          <input
            value={search}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="ค้นหาเมนู…"
          />
        </label>
        <nav className="cms-navigation" aria-label="หมวดการจัดการ">
          {visible.map((g) => (
            <div className="cms-nav-group" key={g.label}>
              <p className="cms-nav-label">{g.label}</p>
              {g.items.map(([key, label, Glyph]) => (
                <button
                  key={key}
                  type="button"
                  className="cms-nav-button"
                  aria-label={label}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => navigate(key)}
                >
                  <Glyph size={18} strokeWidth={1.7} aria-hidden="true" />
                  <span>{label}</span>
                  {typeof counts[key] === "number" && counts[key] > 0 && (
                    <small className="cms-nav-count" aria-hidden="true">
                      {counts[key] > 99 ? "99+" : counts[key]}
                    </small>
                  )}
                </button>
              ))}
            </div>
          ))}
          {!visible.length && (
            <div className="cms-nav-empty">
              <Search size={22} aria-hidden="true" />
              <p>ไม่พบหมวดที่ค้นหา</p>
              <button type="button" onClick={() => onSearch?.("")}>
                ล้างการค้นหา
              </button>
            </div>
          )}
        </nav>
        <div className="cms-sidebar-footer">
          <div className="cms-sidebar-tip">
            <CircleHelp size={17} aria-hidden="true" />
            <span>
              เลือกหมวด แล้วแก้ไขได้ทีละส่วน
              <br />
              <small>ตรวจตัวอย่างก่อนบันทึกทุกครั้ง</small>
            </span>
          </div>
          <div className="cms-account">
            <span className="cms-avatar" aria-hidden="true">
              AD
            </span>
            <span>
              <b>ผู้ดูแลเว็บไซต์</b>
              <small>BSIGN TECH Workspace</small>
            </span>
            <button
              type="button"
              className="cms-icon-button"
              onClick={onLogout}
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
      <div className="cms-workspace" inert={mobile && open ? true : undefined}>
        <header className="cms-topbar">
          <div className="cms-breadcrumb">
            <button
              type="button"
              className="cms-menu-toggle cms-icon-button"
              aria-label="เปิดเมนูจัดการ"
              aria-controls="cms-navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={21} aria-hidden="true" />
            </button>
            <h1>BSIGN TECH · CMS</h1>
            <ChevronRight size={14} aria-hidden="true" />
            <span>{title}</span>
          </div>
          <div className="cms-topbar-actions">
            <span className="cms-workspace-label">
              <i />
              {loading ? "กำลังโหลดข้อมูล" : "พื้นที่จัดการเว็บไซต์"}
            </span>
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="cms-preview-link"
            >
              เปิดเว็บไซต์ <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </header>
        <main
          className="cms-main"
          id="cms-main"
          tabIndex={-1}
          aria-busy={loading}
        >
          <div className="cms-page-heading">
            <div>
              <p className="cms-eyebrow">BSIGN TECH WORKSPACE</p>
              <h2 tabIndex={-1} ref={heading}>
                {title}
              </h2>
              <p>{description}</p>
            </div>
            <span className="cms-page-index" aria-hidden="true">
              /{tab === "dashboard" ? "OVERVIEW" : tab.toUpperCase()}
            </span>
          </div>
          <div className="cms-main-content">{children}</div>
          <footer className="cms-workspace-footer">
            <span>
              BSIGN TECH <b>CONTENT WORKSPACE</b>
            </span>
            <span>พื้นที่ทำงานสำหรับผู้ดูแลเว็บไซต์</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
