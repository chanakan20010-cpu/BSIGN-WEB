export const defaultCardAppearance = Object.freeze({
  background: "#f1f2f4",
  border: "transparent",
});

function safeColor(value) {
  if (value === "transparent") return value;
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

// Stored values are validated by the API as well. This guard keeps malformed or
// future data from becoming free-form CSS in the public page or editor preview.
export function normalizeCardAppearance(
  value,
  defaults = defaultCardAppearance,
) {
  const result = {};
  for (const key of ["background", "border"])
    result[key] =
      safeColor(value?.[key]) ||
      safeColor(defaults?.[key]) ||
      defaultCardAppearance[key];
  return result;
}

export function cardAppearanceStyle(value, defaults = defaultCardAppearance) {
  const appearance = normalizeCardAppearance(value, defaults);
  return {
    "--card-background": appearance.background,
    "--card-border": appearance.border,
  };
}
