import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronRight,
  Database,
  FileText,
  Globe2,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import "./admin.css";

const websiteViews = ["global", "home", "about", "news", "contact", "cta"];
const items = [
  ["dashboard", "ภาพรวม", LayoutDashboard, "overview"],
  ["articles", "ข่าวสารและบทความ", FileText, "จัดการบทความ news posts"],
  [
    "global",
    "ข้อมูลเว็บไซต์",
    Settings2,
    "หน้าแรก เกี่ยวกับเรา ข่าวสาร หมวดหมู่ ติดต่อเรา ฟอร์ม แผนที่ แบนเนอร์ เมนู บริษัท home about news contact cta",
  ],
  ["media", "คลังรูปภาพและไฟล์", Image, "รูปภาพและไฟล์ สื่อ media"],
  ["styles", "สไตล์เว็บไซต์", Palette, "สไตล์ตัวอักษร ไอคอน styles icons"],
  ["contacts", "กล่องข้อความ", Inbox, "ข้อความติดต่อ contacts"],
  ["subscribers", "ผู้รับข่าวสาร", Users, "ผู้สมัครรับข่าวสาร subscribers"],
  ["system", "ระบบและการสำรองข้อมูล", Database, "ข้อมูลระบบ ฐานข้อมูล system"],
];

export function AdminBrand({ compact = false }) {
  return (
    <span className={"cms-brand" + (compact ? " cms-brand-compact" : "")}>
      <span className="cms-brand-mark" aria-hidden="true">
        B<span />
      </span>
      <span className="cms-brand-wordmark">
        <b>
          BSIGN<span>TECH</span>
        </b>
        <small>CONTENT MANAGEMENT</small>
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
  const active = websiteViews.includes(tab)
    ? "global"
    : tab === "icons"
      ? "styles"
      : tab;

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
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = [
        ...sidebar.current.querySelectorAll(
          "button:not(:disabled), input, a[href]",
        ),
      ].filter(
        (element) => element.offsetParent !== null && element.tabIndex >= 0,
      );
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
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
  const visible = items.filter(([key, label, , aliases]) =>
    (key + label + aliases).toLowerCase().includes(query),
  );

  return (
    <div lang="th" className={"admin cms" + (open ? " cms-menu-open" : "")}>
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
            onChange={(event) => onSearch?.(event.target.value)}
            placeholder="ค้นหาเมนู…"
          />
        </label>
        <p className="cms-nav-label">WORKSPACE</p>
        <nav className="cms-navigation" aria-label="หมวดการจัดการ">
          {visible.map(([key, label, Glyph]) => (
            <button
              key={key}
              type="button"
              className="cms-nav-button"
              aria-label={label}
              aria-current={active === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <Glyph size={19} strokeWidth={1.6} aria-hidden="true" />
              <span>{label}</span>
              {key === "contacts" && counts.unread > 0 && (
                <small className="cms-nav-count" aria-hidden="true">
                  {counts.unread > 99 ? "99+" : counts.unread}
                </small>
              )}
            </button>
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
          <button
            type="button"
            className="cms-bottom-link"
            aria-label="ความปลอดภัย"
            aria-current={tab === "password" ? "page" : undefined}
            onClick={() => navigate("password")}
          >
            <ShieldCheck size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>ความปลอดภัย</span>
          </button>
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="cms-bottom-link"
          >
            <Globe2 size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>ดูเว็บไซต์</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <div className="cms-account">
            <span className="cms-avatar" aria-hidden="true">
              B
            </span>
            <span>
              <b>ผู้ดูแลระบบ</b>
              <small>สิทธิ์ผู้ดูแลเว็บไซต์</small>
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
              <Menu size={22} aria-hidden="true" />
            </button>
            <h1 className="cms-sr-only">BSIGN TECH · CMS</h1>
            <span className="cms-breadcrumb-home">พื้นที่จัดการ</span>
            <ChevronRight size={14} aria-hidden="true" />
            <span>{title}</span>
          </div>
          <div className="cms-topbar-actions">
            <span className="cms-workspace-label">
              <i />
              {loading ? "กำลังโหลดข้อมูล" : "ระบบจัดการเว็บไซต์"}
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
              <p className="cms-eyebrow">BSIGN TECH CONTENT MANAGEMENT</p>
              <h2 tabIndex={-1} ref={heading}>
                {title}
              </h2>
              <p>{description}</p>
            </div>
          </div>
          <div className="cms-main-content">{children}</div>
        </main>
        <footer className="cms-workspace-footer">
          <span>BSIGN TECH Content Management</span>
          <span>พื้นที่สำหรับผู้ดูแลเว็บไซต์</span>
        </footer>
      </div>
    </div>
  );
}
