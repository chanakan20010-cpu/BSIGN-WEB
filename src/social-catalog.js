/**
 * Platform identities used by both the contact editor and content migrations.
 * Logo sources and usage notices are recorded in docs/SOCIAL-ASSETS.md.
 * This module deliberately contains data only so it can also be imported by Node.
 */
export const SOCIAL_PLATFORMS = [
  ["facebook", "Facebook", "#0866ff"],
  ["instagram", "Instagram", "#ff0069"],
  ["tiktok", "TikTok", "#000000"],
  ["youtube", "YouTube", "#ff0000"],
  ["line", "LINE", "#00c300"],
  ["x", "X (Twitter)", "#000000"],
  ["threads", "Threads", "#000000"],
  ["linkedin", "LinkedIn", "#0a66c2"],
  ["pinterest", "Pinterest", "#bd081c"],
  ["snapchat", "Snapchat", "#000000"],
  ["reddit", "Reddit", "#ff4500"],
  ["discord", "Discord", "#5865f2"],
  ["telegram", "Telegram", "#26a5e4"],
  ["whatsapp", "WhatsApp", "#25d366"],
  ["bluesky", "Bluesky", "#1185fe"],
  ["wechat", "WeChat", "#07c160"],
  ["weibo", "Weibo", "#e6162d"],
  ["douyin", "Douyin", "#000000"],
  ["kuaishou", "Kuaishou", "#ff4906"],
  ["xiaohongshu", "Xiaohongshu (RedNote)", "#ff2442"],
].map(([id, label, color]) => ({
  id,
  label,
  name: { th: label, en: label },
  color,
}));

const aliases = {
  twitter: "x",
  "x-twitter": "x",
  sinaweibo: "weibo",
  "sina-weibo": "weibo",
  "we-chat": "wechat",
  "tik-tok": "tiktok",
  rednote: "xiaohongshu",
  "red-note": "xiaohongshu",
};

export function getSocialPlatform(id) {
  const key = typeof id === "string" ? id.trim().toLowerCase() : "";
  return SOCIAL_PLATFORMS.find(
    (platform) => platform.id === (aliases[key] || key),
  );
}

export function socialIconDefaults(id) {
  const platform = getSocialPlatform(id);
  return {
    name: platform?.id || "Mail",
    color: platform?.color || "#805b00",
    background: "transparent",
    asset: "",
    mode: "mask",
  };
}

export function createSocialChannel(id) {
  const platform = getSocialPlatform(id) || SOCIAL_PLATFORMS[0];
  return {
    platform: platform.id,
    icon: platform.id,
    name: { ...platform.name },
    handle: "",
    href: "",
    iconStyle: socialIconDefaults(platform.id),
  };
}
