export const textStyleLabels = {
  brand: "ชื่อแบรนด์",
  hero: "หัวข้อหลัก",
  heading: "หัวข้อส่วน",
  panelHeading: "หัวข้อการ์ดเนื้อหา",
  subheading: "หัวข้อรอง",
  intro: "คำโปรย",
  body: "เนื้อหา",
  inverse: "เนื้อหาบนพื้นเข้ม",
  highlight: "ข้อความเน้น",
  menu: "เมนูนำทาง",
  button: "ข้อความปุ่ม",
  label: "ป้ายกำกับ",
  footer: "เนื้อหาส่วนท้าย",
  footerHeading: "หัวข้อส่วนท้าย",
  footerBrand: "ชื่อแบรนด์ส่วนท้าย",
};

export const textAlignLabels = {
  left: "ชิดซ้าย",
  right: "ชิดขวา",
  center: "กึ่งกลาง",
  distributed: "กระจายข้อความ",
  justify: "ชิดขอบทั้งสองด้าน",
};

// Values are validated again on the server. Only known role names can become
// CSS variable references, and no free-form CSS is accepted from a text field.
export function textFormatting(value) {
  const format = value && typeof value === "object" ? value.format : null;
  const role = Object.hasOwn(textStyleLabels, format?.style)
    ? format.style
    : null;
  const align = Object.hasOwn(textAlignLabels, format?.align)
    ? format.align
    : null;
  const style = {};
  if (role) {
    for (const key of ["size", "tablet", "mobile"])
      style[`--bs-format-${key}`] = `var(--${role}-${key})`;
    Object.assign(style, {
      fontFamily: `var(--${role}-font), sans-serif`,
      fontSize: "var(--bs-format-active-size)",
      fontWeight: `var(--${role}-weight)`,
      color: `var(--${role}-color)`,
      letterSpacing: `var(--${role}-spacing)`,
      lineHeight: `var(--${role}-line)`,
    });
  }
  if (align) {
    Object.assign(style, {
      textAlign: ["distributed", "justify"].includes(align) ? "justify" : align,
      textAlignLast: align === "distributed" ? "justify" : "auto",
      textJustify: align === "distributed" ? "inter-character" : "auto",
    });
  }
  return { role, align, style };
}

export function textFormatProps(value) {
  const format = textFormatting(value);
  return {
    className: "bs-formatted-text",
    "data-text-style": format.role || undefined,
    "data-text-align": format.align || undefined,
    style: format.style,
  };
}
