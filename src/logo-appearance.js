export function logoBackground(image, fallback) {
  const value = image?.background;
  return typeof value === "string" &&
    (value === "transparent" || /^#[0-9a-fA-F]{6}$/.test(value))
    ? value
    : fallback;
}
