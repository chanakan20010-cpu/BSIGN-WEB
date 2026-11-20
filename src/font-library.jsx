import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "./api";
import { builtInFonts, isSafeCustomFontFamily } from "./font-catalog.js";
import "./font-library.css";

const fallback = {
  fonts: builtInFonts,
  loading: false,
  error: "",
  refresh: async () => [],
};
const FontLibrary = createContext(fallback);
const filePattern =
  /^\/fonts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(woff2|woff|ttf|otf)$/;
const validWeight = (weight) =>
  Number.isInteger(weight) && weight >= 100 && weight <= 1000;

// The public API has a narrow shape. Validate it again at the CSS boundary so
// metadata and a future API change cannot introduce arbitrary CSS or font URLs.
export function isRenderableFont(font) {
  return (
    !!font &&
    isSafeCustomFontFamily(font.family) &&
    typeof font.id === "string" &&
    font.family === `BSIGN Custom ${font.id}` &&
    filePattern.test(font.url) &&
    font.url === `/fonts/${font.id}.${font.format}` &&
    ["woff2", "woff", "ttf", "otf"].includes(font.format) &&
    ["normal", "italic"].includes(font.style) &&
    validWeight(font.weight) &&
    (!font.weightRange ||
      (Array.isArray(font.weightRange) &&
        font.weightRange.length === 2 &&
        font.weightRange.every(validWeight) &&
        font.weightRange[0] <= font.weightRange[1]))
  );
}

export function FontLibraryProvider({ children }) {
  const [customFonts, setCustomFonts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const requestNumber = useRef(0);
  const refresh = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    if (mounted.current) setLoading(true);
    try {
      const result = await api("/fonts");
      if (!Array.isArray(result)) throw new Error("FONT_LIST_INVALID");
      const custom = result.filter(isRenderableFont);
      if (mounted.current && currentRequest === requestNumber.current) {
        setCustomFonts(custom);
        setError("");
      }
      return custom;
    } catch (cause) {
      if (mounted.current && currentRequest === requestNumber.current)
        setError(cause.message || "REQUEST_FAILED");
      throw cause;
    } finally {
      if (mounted.current && currentRequest === requestNumber.current)
        setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    refresh().catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, [refresh]);
  const value = useMemo(
    () => ({
      fonts: [...builtInFonts, ...customFonts],
      loading,
      error,
      refresh,
    }),
    [customFonts, loading, error, refresh],
  );
  return <FontLibrary.Provider value={value}>{children}</FontLibrary.Provider>;
}

export const useFontLibrary = () => useContext(FontLibrary);

export function FontFaces() {
  const { fonts } = useFontLibrary();
  const css = fonts
    .filter(isRenderableFont)
    .map((font) => {
      const format = {
        ttf: "truetype",
        otf: "opentype",
        woff: "woff",
        woff2: "woff2",
      }[font.format];
      const weight = font.weightRange
        ? font.weightRange.join(" ")
        : font.weight;
      return `@font-face{font-family:${JSON.stringify(font.family)};src:url("${font.url}") format("${format}");font-weight:${weight};font-style:${font.style};font-display:swap;}`;
    })
    .join("\n");
  return css ? <style data-bsign-custom-fonts>{css}</style> : null;
}
