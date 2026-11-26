import { isAllowedFontFamily } from "./font-catalog.js";

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

export const isCustomTextColor = (color) =>
  typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color);

export const inheritedTextFormat = Object.freeze({
  style: "inherit",
  align: "inherit",
  color: "inherit",
  font: "inherit",
  size: "inherit",
  weight: "inherit",
  italic: "inherit",
  underline: "inherit",
  strike: "inherit",
  background: "inherit",
  line: "inherit",
  spacing: "inherit",
});

const inRange = (value, minimum, maximum) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= minimum &&
  value <= maximum;

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
  const color = isCustomTextColor(format?.color) ? format.color : null;
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
  const font =
    typeof format?.font === "string" && isAllowedFontFamily(format.font)
      ? format.font
      : null;
  if (font)
    style.fontFamily = ["serif", "sans-serif"].includes(font)
      ? font
      : `${JSON.stringify(font)}, sans-serif`;
  if (inRange(format?.size, 10, 100)) style.fontSize = `${format.size}px`;
  if (
    inRange(format?.weight, 100, 900) &&
    Number.isInteger(format.weight) &&
    format.weight % 100 === 0
  )
    style.fontWeight = format.weight;
  if (typeof format?.italic === "boolean")
    style.fontStyle = format.italic ? "italic" : "normal";
  if (
    typeof format?.underline === "boolean" ||
    typeof format?.strike === "boolean"
  )
    style.textDecorationLine =
      [
        format.underline === true && "underline",
        format.strike === true && "line-through",
      ]
        .filter(Boolean)
        .join(" ") || "none";
  if (
    isCustomTextColor(format?.background) ||
    format?.background === "transparent"
  )
    style.backgroundColor = format.background;
  if (inRange(format?.line, 1, 3)) style.lineHeight = format.line;
  if (inRange(format?.spacing, -4, 20))
    style.letterSpacing = `${format.spacing}px`;
  if (color) style.color = color;
  return { role, align, color, style };
}

export function textFormatProps(value) {
  const format = textFormatting(value);
  return {
    className: "bs-formatted-text",
    "data-text-style": format.role || undefined,
    "data-text-align": format.align || undefined,
    "data-text-color": format.color ? "custom" : undefined,
    style: format.style,
  };
}
