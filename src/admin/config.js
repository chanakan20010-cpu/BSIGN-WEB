export const pages = {
  dashboard: ["ภาพรวม", "เริ่มงานประจำวันและติดตามความเคลื่อนไหวของเว็บไซต์"],
  global: ["ข้อมูลเว็บไซต์", "แบรนด์ เมนู ช่องทางติดต่อ และข้อความส่วนกลาง"],
  home: ["หน้าแรก", "จัดเรื่องราวแรกที่ผู้เข้าชมจะเห็นให้เป็นปัจจุบัน"],
  about: ["เกี่ยวกับเรา", "แนะนำทีม วิสัยทัศน์ และจุดแข็งของ BSIGN TECH"],
  news: ["ตั้งค่าหน้าข่าวสาร", "หัวข้อ หมวดหมู่ และการแสดงรายการข่าวบนเว็บไซต์"],
  contact: ["ติดต่อเรา", "ช่องทางติดต่อ แบบฟอร์ม และตำแหน่งสำนักงาน"],
  cta: ["แบนเนอร์ติดต่อ", "ข้อความและปุ่มเชิญชวนที่ใช้ร่วมกันบนเว็บไซต์"],
  styles: ["สไตล์ตัวอักษร", "ดูตัวอย่างและปรับตัวอักษรที่ใช้ร่วมกันทุกหน้า"],
  icons: ["ไอคอน", "จัดการภาพสัญลักษณ์และสีของแต่ละตำแหน่ง"],
  articles: ["ข่าวสารและบทความ", "เขียน จัดหมวดหมู่ และกำหนดเวลาเผยแพร่ข่าวสาร"],
  media: ["รูปภาพและไฟล์", "คลังสื่อพร้อมแหล่งที่มาและสิทธิ์การใช้งาน"],
  contacts: ["กล่องข้อความ", "ติดตามและจัดการข้อความจากแบบฟอร์มติดต่อ"],
  subscribers: ["ผู้สมัครรับข่าวสาร", "ค้นหาและดูแลรายชื่ออีเมลที่สมัครเข้ามา"],
  password: ["ความปลอดภัย", "เปลี่ยนรหัสผ่านและดูแลการเข้าถึงบัญชีผู้ดูแล"],
  system: ["ข้อมูลระบบและการสำรอง", "ตรวจสุขภาพเว็บไซต์และเตรียมข้อมูลก่อนอัปเดต"],
};
export const sections = {
  global: [
    [
      "brand",
      "แบรนด์และโลโก้",
      "ชื่อแบรนด์และภาพที่ใช้เป็นตัวแทนองค์กร",
      ["brand", "company", "logo", "footerLogo", "favicon"],
    ],
    [
      "navigation",
      "เมนูและการนำทาง",
      "ชื่อเมนู ลิงก์ และข้อความสำหรับการใช้งานเว็บไซต์",
      ["nav", "languages", "menuLabel", "skip"],
    ],
    [
      "company",
      "ข้อมูลบริษัท",
      "ข้อมูลที่แสดงในส่วนท้ายและช่องทางติดต่อ",
      ["email", "phone", "address", "contactHeading", "addressHeading"],
    ],
    [
      "messages",
      "ปุ่มและข้อความระบบ",
      "ข้อความค้นหา โหลดข้อมูล และสถานะรายการ",
      [
        "readMore",
        "search",
        "all",
        "previous",
        "next",
        "empty",
        "loading",
        "error",
        "notFound",
        "back",
      ],
    ],
    [
      "privacy",
      "ความเป็นส่วนตัว",
      "หัวข้อและนโยบายสำหรับผู้เข้าชม",
      ["privacyLabel", "privacy"],
    ],
  ],
  home: [
    [
      "intro",
      "ส่วนเปิดหน้า",
      "หัวข้อหลัก คำแนะนำ รูปภาพ และปุ่มแรกของหน้า",
      ["title", "intro", "hero", "cta", "ctaHref"],
    ],
    ["services", "บริการของเรา", "หัวข้อและการ์ดบริการ", ["services", "cards"]],
    [
      "advantages",
      "จุดแข็งของเรา",
      "เหตุผลที่ลูกค้าเลือก BSIGN TECH",
      ["why", "advantages", "team", "badge", "badgeTitle"],
    ],
    ["news", "ข่าวที่แสดง", "เลือกหมวดข่าวที่นำมาแสดงหน้าแรก", ["newsCategory"]],
  ],
  about: [
    [
      "intro",
      "ส่วนเปิดหน้า",
      "เรื่องราวและภาพแนะนำองค์กร",
      ["title", "intro", "hero"],
    ],
    [
      "approach",
      "แนวทางการทำงาน",
      "แนวคิด วิธีการ และข้อมูลสนับสนุน",
      ["matrix", "version", "method", "methodTitle", "stats"],
    ],
    [
      "vision",
      "วิสัยทัศน์และพันธกิจ",
      "ทิศทางและเป้าหมายขององค์กร",
      ["vision", "missions"],
    ],
    ["values", "คุณค่าของเรา", "หัวข้อและรายละเอียดคุณค่าหลัก", ["values", "cards"]],
  ],
  news: [
    [
      "intro",
      "หัวข้อและส่วนแสดงผล",
      "ข้อความบนหน้ารวมข่าวและหน้าบทความ",
      ["title", "section", "related", "latest", "gallery", "articleTitleColor"],
    ],
    [
      "categories",
      "หมวดหมู่และรายการ",
      "หมวดข่าวและจำนวนรายการต่อหน้า",
      ["categories", "pageSize"],
    ],
  ],
  contact: [
    [
      "intro",
      "ส่วนเปิดหน้า",
      "หัวข้อและข้อความแนะนำการติดต่อ",
      ["title", "subtitle", "heading", "formHeading"],
    ],
    [
      "channels",
      "ช่องทางและเวลาทำการ",
      "ข้อมูลติดต่อและลิงก์เครือข่ายสังคม",
      [
        "emailLabel",
        "email",
        "phoneLabel",
        "hoursLabel",
        "hours",
        "closed",
        "socialHeading",
        "socials",
      ],
    ],
    [
      "form",
      "แบบฟอร์มและข้อความตอบกลับ",
      "ชื่อช่อง ข้อตกลง ปุ่ม และสถานะการส่งข้อความ",
      ["fields", "consent", "submit", "success", "pending", "invalid"],
    ],
    [
      "map",
      "แผนที่และการนำทาง",
      "ยืนยันพิกัดจริงก่อนเปิดแผนที่",
      ["mapPending", "directions", "map"],
    ],
  ],
  cta: [
    [
      "banner",
      "แบนเนอร์เชิญชวน",
      "ข้อความและลิงก์สำหรับติดต่อทีมงาน",
      [
        "eyebrow",
        "title",
        "body",
        "primary",
        "primaryHref",
        "secondary",
        "secondaryHref",
      ],
    ],
  ],
};
export const dateText = (value) => {
  if (!value || Number.isNaN(Date.parse(value))) return "ยังไม่กำหนด";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
};
