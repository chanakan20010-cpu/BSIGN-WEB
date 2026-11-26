import { z } from "zod";
import { isAllowedFontFamily } from "../src/font-catalog.js";
import {
  adminPresentationDefaults,
  requiredAdminPresentationFields,
} from "./admin-presentation-defaults.js";
export const text = z.string().max(30000);
export const textFormatSchema = z
  .object({
    style: z
      .enum([
        "inherit",
        "brand",
        "hero",
        "heading",
        "panelHeading",
        "subheading",
        "body",
        "inverse",
        "intro",
        "highlight",
        "menu",
        "button",
        "label",
        "footer",
        "footerHeading",
        "footerBrand",
      ])
      .optional(),
    align: z
      .enum(["inherit", "left", "right", "center", "distributed", "justify"])
      .optional(),
    color: z
      .union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal("inherit")])
      .optional(),
    font: z
      .union([z.literal("inherit"), z.string().refine(isAllowedFontFamily)])
      .optional(),
    size: z
      .union([z.literal("inherit"), z.number().finite().min(10).max(100)])
      .optional(),
    weight: z
      .union([
        z.literal("inherit"),
        z.number().int().min(100).max(900).multipleOf(100),
      ])
      .optional(),
    italic: z.union([z.literal("inherit"), z.boolean()]).optional(),
    underline: z.union([z.literal("inherit"), z.boolean()]).optional(),
    strike: z.union([z.literal("inherit"), z.boolean()]).optional(),
    background: z
      .union([
        z.literal("inherit"),
        z.literal("transparent"),
        z.string().regex(/^#[0-9a-fA-F]{6}$/),
      ])
      .optional(),
    line: z
      .union([z.literal("inherit"), z.number().finite().min(1).max(3)])
      .optional(),
    spacing: z
      .union([z.literal("inherit"), z.number().finite().min(-4).max(20)])
      .optional(),
  })
  .passthrough();
export const bi = z
  .object({ th: text, en: text, format: textFormatSchema.optional() })
  .passthrough();
export const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const surfaceColor = z.union([color, z.literal("transparent")]);
export const cardAppearanceSchema = z
  .object({ background: surfaceColor, border: surfaceColor })
  .strict();
const requiredPresentationFields = new Set(requiredAdminPresentationFields);
export const adminPresentationSchema = z
  .object(
    Object.fromEntries(
      Object.keys(adminPresentationDefaults).map((key) => [
        key,
        z
          .string()
          .max(5000)
          .regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/)
          .refine(
            (value) =>
              !requiredPresentationFields.has(key) || Boolean(value.trim()),
          ),
      ]),
    ),
  )
  .strict();
export const iconSchema = z
  .object({
    name: z.string().max(50),
    color,
    background: z.union([color, z.literal("transparent")]),
    asset: z.string().regex(/^$|^\/uploads\/[a-f0-9-]+\.(svg|png|webp)$/),
    mode: z.enum(["mask", "image"]),
  })
  .passthrough()
  .refine(
    (icon) =>
      icon.mode !== "mask" || !icon.asset || icon.asset.endsWith(".svg"),
    "Raster images use their original colors",
  );
const editorLabel = z.string().max(300);
const safeLabelKey = z
  .string()
  .max(300)
  .regex(/^[A-Za-z0-9_.-]+$/);
export const editorLabelsSchema = z
  .object({
    sections: z
      .record(
        safeLabelKey,
        z
          .object({
            title: editorLabel.optional(),
            description: z.string().max(1000).optional(),
          })
          .passthrough(),
      )
      .optional(),
    fields: z.record(safeLabelKey, editorLabel).optional(),
  })
  .passthrough();
export const link = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      v === "" ||
      /^\/(?!\/)/.test(v) ||
      /^https:\/\//.test(v) ||
      /^mailto:[^\s]+$/.test(v) ||
      /^tel:[+\d -]+$/.test(v),
    "Use a relative path, HTTPS, mailto or tel",
  );
export const image = z
  .object({
    url: link,
    alt: bi,
    crop: z.array(z.number().finite().nonnegative()).length(6).nullable(),
    background: surfaceColor.optional(),
  })
  .passthrough()
  .refine(
    (v) => !v.crop || v.crop.slice(2).every((n) => n > 0),
    "Invalid crop",
  );
export const articleBlockSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .min(1)
      .max(100),
    text: bi,
    image: image.nullable(),
    align: z.enum(["left", "center", "right"]),
    ratio: z.enum(["original", "16:9", "4:3", "1:1", "3:4"]),
  })
  .passthrough();
export const articleSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(150),
    title: bi,
    excerpt: bi,
    body: bi,
    lead: bi.optional(),
    secondaryBody: bi.optional(),
    inlineImage: image.nullable().optional(),
    blocks: z
      .array(articleBlockSchema)
      .max(100)
      .refine(
        (blocks) =>
          new Set(blocks.map((block) => block.id)).size === blocks.length,
        "Paragraph identifiers must be unique",
      )
      .optional(),
    category: z.string().min(1).max(100),
    status: z.enum(["draft", "published"]),
    publishedAt: z.string().datetime(),
    image,
    heroImage: image.nullable().optional(),
    gallery: z.array(image).max(30),
  })
  .passthrough();
export const styleSchema = z.object({
  font: z.string().refine(isAllowedFontFamily, "Choose an available font"),
  size: z.number().min(10).max(100),
  tablet: z.number().min(10).max(100),
  mobile: z.number().min(10).max(100),
  color,
  weight: z.number().int().min(100).max(900),
  spacing: z.number().min(-4).max(20),
  line: z.number().min(1).max(3),
});
export const contactSchema = z.object({
  name: z.string().min(2).max(150),
  company: z.string().max(200).default(""),
  email: z.email().max(254),
  phone: z.string().max(40).default(""),
  message: z.string().min(5).max(5000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
// Validate all persisted leaves, including unrecognized future keys. Known shapes are
// validated after merging so partial requests cannot silently delete newer fields.
export function validateTree(v, key = "") {
  if (
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.hasOwn(v, "url") &&
    Object.hasOwn(v, "alt") &&
    Object.hasOwn(v, "crop")
  )
    image.parse(v);
  if (key === "appearance") cardAppearanceSchema.parse(v);
  if (key === "format") textFormatSchema.parse(v);
  if (key === "editorLabels") editorLabelsSchema.parse(v);
  if (key === "editorLabel") editorLabel.parse(v);
  if (
    key === "footIcon" ||
    key === "iconStyle" ||
    (key === "icon" && typeof v !== "string")
  )
    iconSchema.parse(v);
  if (v === null || typeof v === "boolean") return;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw Error("Invalid number");
    return;
  }
  if (typeof v === "string") {
    text.parse(v);
    if (/^(url|href|sourceUrl|favicon)$/.test(key)) link.parse(v);
    if (/color$/i.test(key)) color.parse(v);
    if (key === "background" && v !== "transparent") color.parse(v);
    return;
  }
  if (Array.isArray(v)) {
    if (v.length > 200) throw Error("Too many items");
    v.forEach((x) => validateTree(x, key));
    return;
  }
  if (typeof v !== "object") throw Error("Invalid content");
  for (const [k, x] of Object.entries(v)) {
    if (["__proto__", "constructor", "prototype"].includes(k))
      throw Error("Unsafe key");
    // These format leaves were validated above. Reset sentinels must not
    // loosen validation of unrelated theme, icon or image color fields.
    if (key === "format" && ["color", "background"].includes(k)) continue;
    validateTree(x, k);
  }
}

// A syntactically valid custom family also needs a registered font asset.
// Callers validate this list against the database before persisting content.
export function textFormatFontFamilies(value) {
  const families = new Set();
  const seen = new WeakSet();
  function visit(node) {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    const family = node.format?.font;
    if (typeof family === "string" && family !== "inherit")
      families.add(family);
    for (const child of Object.values(node)) visit(child);
  }
  visit(value);
  return [...families];
}

export function validateShape(template, value, path = "") {
  if (path.endsWith(".crop")) {
    z.array(z.number().finite().nonnegative())
      .length(6)
      .nullable()
      .parse(value);
    return;
  }
  if (template === null) {
    if (value !== null)
      z.array(z.number().finite().nonnegative()).length(6).parse(value);
    return;
  }
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length > 200)
      throw Error("Invalid array");
    if (template.length && value.length === 0) throw Error("Required list");
    if (template.length)
      value.forEach((v) => validateShape(template[0], v, path));
    return;
  }
  if (typeof template === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Invalid object");
    for (const k of Object.keys(template)) {
      // New optional presentation fields are additive. An older client may add
      // a card without them; existing values are retained by merge beforehand.
      if (
        value[k] === undefined &&
        [
          "icon",
          "footIcon",
          "editorLabel",
          "editorLabels",
          "format",
          "footerNav",
          "footerHeading",
          "footerBrand",
          "panelHeading",
          "appearance",
          "iconStyle",
          "platform",
        ].includes(k)
      )
        continue;
      validateShape(template[k], value[k], path + "." + k);
    }
    return;
  }
  if (typeof value !== typeof template)
    throw Error("Invalid field type: " + path);
}
