// Public display content only. This document must never contain credentials,
// account records, session settings, or authentication policy.
export const adminPresentationDefaults = {
  sidebarCaption: "{company}",
  workspaceHeading: "{brand} · CMS",
  workspaceEyebrow: "{brand} CONTENT MANAGEMENT",
  workspaceFooter: "{brand} Content Management",
  workspaceFooterNote: "พื้นที่สำหรับผู้ดูแลเว็บไซต์",
  storyEyebrow: "A WORKSPACE FOR YOUR NEXT CHAPTER",
  storyTitle: "ดูแลทุกเรื่องราว\nให้เติบโตไปด้วยกัน",
  storyIntro: "จัดการเนื้อหา ภาพ และข่าวสารของ {brand}\nให้พร้อมเชื่อมต่อกับทุกโอกาส",
  storyTagline: "Built for your next update.",
  storyFooter: "{companyEn}",
  welcome: "WELCOME BACK",
  title: "เข้าสู่ระบบจัดการเว็บไซต์",
  description: "พื้นที่สำหรับผู้ดูแลเว็บไซต์ {brand}",
  backLabel: "กลับไปยังเว็บไซต์",
  emailLabel: "อีเมล",
  emailPlaceholder: "อีเมลผู้ดูแลระบบ",
  passwordLabel: "รหัสผ่าน",
  passwordPlaceholder: "กรอกรหัสผ่านของคุณ",
  showPasswordLabel: "แสดงรหัสผ่าน",
  hidePasswordLabel: "ซ่อนรหัสผ่าน",
  capsLock: "เปิด Caps Lock อยู่ กรุณาตรวจตัวพิมพ์ของรหัสผ่าน",
  submitLabel: "เข้าสู่ระบบ",
  pendingLabel: "กำลังเข้าสู่ระบบ…",
  helpTitle: "เข้าใช้งานครั้งแรก? ใช้บัญชีที่สร้างไว้ในไฟล์ initial-admin.txt ของโปรเจกต์",
  helpSummary: "ดูวิธีค้นหาบัญชีผู้ดูแล",
  helpInstructions:
    "เปิดโฟลเดอร์โปรเจกต์ แล้วเปิด .data/initial-admin.txt ด้วย Notepad หากกำหนดโฟลเดอร์ข้อมูลเอง ให้ดูตำแหน่งที่ CMD แสดง",
  helpRecovery:
    "หากเปลี่ยนรหัสผ่านแล้ว ให้ใช้รหัสใหม่ บัญชีจากรุ่นก่อนยังใช้อีเมลและรหัสเดิมได้ หากจำไม่ได้ ให้หยุดพรีวิวแล้วเปิด OPEN-PREVIEW.vbs เพื่อกู้บัญชี",
  copyright: "© {year} {companyEn}",
  invalidCredentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง",
  rateLimited: "มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
  validationError: "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง กรุณาตรวจช่องที่แก้ไข",
  sessionExpired: "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
  genericError: "ยังทำรายการไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง",
  passwordChanged: "เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่",
};

export const requiredAdminPresentationFields = [
  "workspaceHeading",
  "title",
  "backLabel",
  "emailLabel",
  "passwordLabel",
  "showPasswordLabel",
  "hidePasswordLabel",
  "submitLabel",
  "pendingLabel",
  "helpSummary",
  "invalidCredentials",
  "rateLimited",
  "validationError",
  "sessionExpired",
  "genericError",
  "passwordChanged",
];

const required = new Set(requiredAdminPresentationFields);
export function sanitizePublicAdminPresentation(value) {
  return Object.fromEntries(
    Object.entries(adminPresentationDefaults).map(([key, fallback]) => {
      const stored = value?.[key];
      return [
        key,
        typeof stored === "string" &&
        stored.length <= 5000 &&
        (!required.has(key) || stored.trim())
          ? stored
          : fallback,
      ];
    }),
  );
}

export function renderAdminPresentationText(
  value,
  global = {},
  year = new Date().getFullYear(),
) {
  const text = (value, language = "th") =>
    typeof value === "string"
      ? value
      : value?.[language] || value?.th || value?.en || "";
  const tokens = {
    brand: text(global.brand),
    company: text(global.company),
    companyEn: text(global.company, "en"),
    year: String(year),
  };
  return String(value ?? "").replace(
    /\{(brand|company|companyEn|year)\}/g,
    (_, token) => tokens[token],
  );
}
