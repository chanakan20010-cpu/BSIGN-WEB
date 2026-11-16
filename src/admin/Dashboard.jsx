import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Inbox,
  Users,
  Globe,
  Image as ImageIcon,
} from "lucide-react";
import { Picture } from "../shared";
import { dateText } from "./config";
import MaintenanceControls from "./MaintenanceControls";
export default function Dashboard({
  overview,
  onNavigate,
  maintenanceDoc,
  onSaveMaintenance,
  onMaintenanceDirty,
}) {
  if (!overview)
    return (
      <div className="cms-card cms-skeleton" role="status">
        กำลังโหลดภาพรวม…
      </div>
    );
  const { counts, recentArticles, recentContacts, system } = overview;
  return (
    <>
      <MaintenanceControls
        document={maintenanceDoc}
        onSave={onSaveMaintenance}
        version={system.version}
        onDirtyChange={onMaintenanceDirty}
      />
      <section className="cms-metrics" aria-label="สรุปข้อมูลเว็บไซต์">
        {[
          [
            "articles",
            "บทความทั้งหมด",
            counts.articles,
            counts.published + " เผยแพร่แล้ว · " + counts.draft + " ฉบับร่าง",
            FileText,
          ],
          [
            "contacts",
            "ข้อความติดต่อ",
            counts.contacts,
            counts.unread + " ข้อความที่ยังไม่อ่าน",
            Inbox,
          ],
          [
            "subscribers",
            "ผู้รับข่าวสาร",
            counts.subscribers,
            "ผู้ติดตามข่าวสารขององค์กร",
            Users,
          ],
        ].map(([key, label, number, detail, Glyph], i) => (
          <button
            className="cms-metric"
            data-tone={["brand", "blue", "gold"][i]}
            onClick={() => onNavigate(key)}
            key={key}
          >
            <span className="cms-metric-top">
              <span className="cms-metric-icon">
                <Glyph size={22} />
              </span>
              <ArrowUpRight size={16} />
            </span>
            <span>{label}</span>
            <strong>{number}</strong>
            <small>{detail}</small>
          </button>
        ))}
      </section>
      <div className="cms-dashboard-grid">
        <section className="cms-card">
          <div className="cms-card-header">
            <div>
              <h3>บทความล่าสุด</h3>
              <p>อัปเดตเรื่องราวและความเคลื่อนไหว</p>
            </div>
            <button
              className="cms-text-button"
              onClick={() => onNavigate("articles")}
            >
              ดูทั้งหมด <ArrowRight size={16} />
            </button>
          </div>
          {recentArticles.length ? (
            <div className="cms-recent-list">
              {recentArticles.map((a) => (
                <button
                  className="cms-recent-row"
                  onClick={() => onNavigate("articles")}
                  key={a.id}
                >
                  {a.image?.url ? (
                    <span className="cms-recent-thumb">
                      <Picture value={a.image} />
                    </span>
                  ) : (
                    <span className="cms-recent-thumb cms-recent-placeholder">
                      <ImageIcon size={22} />
                    </span>
                  )}
                  <span>
                    <strong>{a.title.th || a.title.en}</strong>
                    <small>{dateText(a.publishedAt)}</small>
                  </span>
                  <span
                    className="cms-badge"
                    data-tone={
                      a.status === "draft"
                        ? "warning"
                        : Date.parse(a.publishedAt) > Date.now()
                          ? "neutral"
                          : "success"
                    }
                  >
                    {a.status === "draft"
                      ? "ฉบับร่าง"
                      : Date.parse(a.publishedAt) > Date.now()
                        ? "ตั้งเวลา"
                        : "เผยแพร่แล้ว"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="cms-empty">
              <FileText size={36} aria-hidden="true" />
              <h3>เริ่มต้นด้วยบทความแรก</h3>
              <p>เพิ่มข่าวสารและเรื่องราวของ BSIGN TECH</p>
            </div>
          )}
        </section>
        <section className="cms-card">
          <div className="cms-card-header">
            <div>
              <h3>ข้อความล่าสุด</h3>
              <p>เชื่อมต่อทุกโอกาสทางธุรกิจ</p>
            </div>
            <button
              className="cms-text-button"
              aria-label="เปิดกล่องข้อความ"
              onClick={() => onNavigate("contacts")}
            >
              <ArrowUpRight size={19} />
            </button>
          </div>
          {recentContacts.length ? (
            <div className="cms-recent-list">
              {recentContacts.map((c) => (
                <button
                  className="cms-recent-row"
                  onClick={() => onNavigate("contacts")}
                  key={c.id}
                >
                  <span className="cms-avatar">{c.name.slice(0, 1)}</span>
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.email}</small>
                  </span>
                  <span
                    className="cms-badge"
                    data-tone={c.status === "new" ? "warning" : "success"}
                  >
                    {c.status === "new" ? "ใหม่" : "อ่านแล้ว"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="cms-empty">
              <Inbox size={40} aria-hidden="true" />
              <h3>ยังไม่มีข้อความใหม่</h3>
              <p>ข้อความจากหน้าติดต่อจะแสดงที่นี่</p>
            </div>
          )}
        </section>
      </div>
      <section className="cms-quick-banner">
        <span className="cms-quick-banner-icon">
          <Globe size={30} />
        </span>
        <div>
          <h3>เว็บไซต์ที่เติบโตไปพร้อมกับองค์กร</h3>
          <p>ดูแลข้อมูลบริษัท ช่องทางติดต่อ และภาพลักษณ์ของคุณให้เป็นปัจจุบันเสมอ</p>
        </div>
        <button className="cms-secondary" onClick={() => onNavigate("global")}>
          จัดการข้อมูลเว็บไซต์ <ArrowUpRight size={16} />
        </button>
      </section>
    </>
  );
}
