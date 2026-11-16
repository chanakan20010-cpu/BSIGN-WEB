import React from "react";
import { InlineIconEditor } from "./Editors";

export function pageIconSlots(page, group, value) {
  const sharedNews = [
    ["news.category", "marker", "เครื่องหมายหมวดข่าว (การ์ดข่าวทุกหน้า)"],
    ["news.card.arrow", "arrow", "ลูกศรอ่านต่อ (การ์ดข่าวทุกหน้า)"],
    ["news.section.marker", "marker", "เครื่องหมายหัวข้อข่าว"],
  ];
  const fixed = {
    "global.navigation": [["header.menu", "menu", "ปุ่มเมนูมือถือ"]],
    "global.company": [
      ["footer.mail", "mail", "อีเมลส่วนท้ายเว็บ"],
      ["footer.phone", "phone", "โทรศัพท์ส่วนท้ายเว็บ"],
      ["footer.pin", "pin", "ที่อยู่ส่วนท้ายเว็บ"],
    ],
    "home.intro": [["home.hero.arrow", "arrow", "ลูกศรปุ่มส่วนเปิดหน้า"]],
    "home.services": [
      ["home.services.marker", "marker", "เครื่องหมายหัวข้อบริการ"],
      ...(value.cards || []).map((_, i) => [
        `home.service.${i}`,
        "terminal",
        `ไอคอนบริการ ${i + 1}`,
      ]),
    ],
    "home.advantages": [
      ["home.why.marker", "marker", "เครื่องหมายหัวข้อจุดแข็ง"],
      ["home.badge", "bolt", "ไอคอนป้ายภาพทีมงาน"],
      ...(value.advantages || []).map((_, i) => [
        `home.advantage.${i}`,
        "rocket",
        `ไอคอนจุดแข็ง ${i + 1}`,
      ]),
    ],
    "home.news": sharedNews,
    "about.vision": [
      ["about.vision.marker", "marker", "เครื่องหมายหัวข้อวิสัยทัศน์"],
      ...(value.missions || []).map((_, i) => [
        `about.mission.${i}`,
        i ? "rocket" : "eye",
        `ไอคอนพันธกิจ ${i + 1}`,
      ]),
    ],
    "about.values": [
      ["about.values.marker", "marker", "เครื่องหมายหัวข้อคุณค่า"],
      ...(value.cards || []).flatMap((_, i) => [
        [
          `about.value.${i}`,
          ["speed", "engineering", "heart", "brain"][i % 4],
          `ไอคอนคุณค่า ${i + 1}`,
        ],
        [`about.foot.${i}`, "marker", `เครื่องหมายท้ายคุณค่า ${i + 1}`],
      ]),
    ],
    "news.intro": [
      ...sharedNews,
      ["news.latest", "marker", "ป้ายข่าวล่าสุด"],
      ["news.featured.arrow", "arrow", "ลูกศรปุ่มข่าวเด่น"],
      ["news.search", "search", "ไอคอนค้นหาข่าว"],
      ["news.previous", "previous", "ปุ่มข่าวหน้าก่อน"],
      ["news.next", "next", "ปุ่มข่าวหน้าถัดไป"],
    ],
    "contact.channels": [
      ["contact.mail", "mail", "ไอคอนอีเมล"],
      ["contact.phone", "phone", "ไอคอนโทรศัพท์"],
      ["contact.clock", "clock", "ไอคอนเวลาทำการ"],
      ...(value.socials || []).map((s, i) => [
        `social.${i}`,
        s.icon,
        `ไอคอนโซเชียล ${s.label?.th || s.name || i + 1}`,
      ]),
    ],
    "contact.form": [["contact.submit", "arrow", "ลูกศรปุ่มส่งข้อความ"]],
    "contact.map": [["contact.office", "building", "ไอคอนสำนักงาน"]],
    "cta.banner": [["cta.arrow", "arrow", "ลูกศรปุ่มแบนเนอร์ติดต่อ (ใช้ร่วมทุกหน้า)"]],
  };
  return fixed[page + "." + group] || [];
}

export default function PageIcons({
  page,
  group,
  value,
  icons,
  defaults,
  onChange,
}) {
  const slots = pageIconSlots(page, group, value);
  if (!slots.length || !icons) return null;
  return (
    <section className="cms-page-icons" aria-label="ไอคอนในส่วนนี้">
      <h4>ไอคอนในส่วนนี้</h4>
      <p className="cms-hint">
        เลือกไอคอนและสีได้ที่นี่ ตำแหน่งที่ใช้ร่วมกันจะระบุไว้ในชื่อ
        บันทึกด้วยปุ่มบันทึกการเปลี่ยนแปลงด้านบน
      </p>
      <div className="cms-page-icons-grid">
        {slots.map(([slot, iconKey, label]) => (
          <InlineIconEditor
            key={slot}
            slot={slot}
            iconKey={iconKey}
            label={label}
            icons={icons}
            defaults={defaults}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}
