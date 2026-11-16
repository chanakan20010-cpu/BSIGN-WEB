import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Upload } from "lucide-react";
import { api } from "../api";
import "./device-image-upload.css";

const accepted = /\.(svg|png|jpe?g|webp)$/i;
export const ImageUploadBusyContext = createContext(null);
export async function uploadImageFiles(
  files,
  { source = "", license = "", onProgress } = {},
) {
  const selected = Array.from(files || []);
  if (!selected.length) return [];
  if (selected.length > 30) throw new Error("เลือกได้ครั้งละไม่เกิน 30 ภาพ");
  for (const file of selected) {
    if (!accepted.test(file.name))
      throw new Error("รองรับเฉพาะไฟล์ SVG, PNG, JPEG และ WebP");
    if (file.size > 8 * 1024 * 1024)
      throw new Error(`ไฟล์ ${file.name} มีขนาดเกิน 8 MB`);
  }
  const uploaded = [];
  try {
    for (const file of selected) {
      const body = new FormData();
      body.set("file", file);
      body.set("source", source);
      body.set("license", license);
      const result = await api("/admin/media", { method: "POST", body });
      const name = file.name.replace(/\.[^.]+$/, "");
      uploaded.push({
        url: result.url,
        alt: { th: name, en: name },
        crop: null,
      });
      onProgress?.(uploaded.length, selected.length);
    }
  } catch (error) {
    error.uploaded = uploaded;
    throw error;
  }
  return uploaded;
}

export function DeviceImageUpload({
  label = "อัปโหลดภาพจากอุปกรณ์",
  multiple = false,
  maxFiles = multiple ? 30 : 1,
  disabled = false,
  onUploaded,
  onBusyChange,
}) {
  const uploadBusy = useContext(ImageUploadBusyContext);
  const inputId = useId(),
    noteId = useId(),
    alive = useRef(true),
    busyRegistration = useRef(null),
    callbacks = useRef({
      onUploaded,
      onBusyChange: onBusyChange || uploadBusy,
    });
  callbacks.current = { onUploaded, onBusyChange: onBusyChange || uploadBusy };
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [source, setSource] = useState(""),
    [license, setLicense] = useState("");
  const finishBusy = () => {
    const registered = busyRegistration.current;
    busyRegistration.current = null;
    registered?.(false);
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      finishBusy();
    };
  }, []);
  async function upload(event) {
    const input = event.currentTarget,
      files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    if (files.length > maxFiles) {
      setError(`เลือกได้อีกไม่เกิน ${maxFiles} ภาพ`);
      setStatus("");
      return;
    }
    setBusy(true);
    setError("");
    setStatus(`กำลังอัปโหลด 0 / ${files.length} ภาพ…`);
    busyRegistration.current = callbacks.current.onBusyChange || null;
    busyRegistration.current?.(true);
    try {
      const images = await uploadImageFiles(files, {
        source,
        license,
        onProgress: (done, total) => {
          if (alive.current) setStatus(`กำลังอัปโหลด ${done} / ${total} ภาพ…`);
        },
      });
      if (alive.current) {
        callbacks.current.onUploaded?.(images);
        setStatus(`อัปโหลดแล้ว ${images.length} ภาพ กรุณาบันทึกการเปลี่ยนแปลง`);
      }
    } catch (err) {
      if (alive.current) {
        if (err.uploaded?.length) callbacks.current.onUploaded?.(err.uploaded);
        const messages = {
          INVALID_IMAGE: "ไฟล์ภาพไม่ถูกต้องหรือชนิดไฟล์ไม่รองรับ",
          UNSAFE_SVG: "ไฟล์ SVG มีโครงสร้างที่ไม่ปลอดภัย",
          INVALID_SVG: "ไม่สามารถอ่านไฟล์ SVG นี้ได้",
          FILE_REQUIRED: "กรุณาเลือกไฟล์ภาพ",
          LIMIT_FILE_SIZE: "ไฟล์มีขนาดเกิน 8 MB",
          CSRF_FAILED: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง",
        };
        setError(
          (err.uploaded?.length
            ? `อัปโหลดสำเร็จ ${err.uploaded.length} ภาพแล้ว ภาพที่เหลือไม่สำเร็จ: `
            : "") +
            (messages[err.message] ||
              (/^[A-Z_]+$/.test(err.message)
                ? "อัปโหลดไม่สำเร็จ กรุณาตรวจไฟล์แล้วลองอีกครั้ง"
                : err.message)),
        );
        setStatus("");
      }
    } finally {
      finishBusy();
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="cms-device-upload" aria-busy={busy}>
      <label htmlFor={inputId}>
        <span>
          <Upload size={16} aria-hidden="true" /> {label}
        </span>
        <input
          id={inputId}
          type="file"
          accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg,.png,.jpg,.jpeg,.webp"
          multiple={multiple}
          disabled={disabled || busy}
          aria-describedby={noteId}
          onChange={upload}
        />
      </label>
      <p id={noteId} className="cms-muted">
        SVG, PNG, JPEG หรือ WebP ไม่เกิน 8 MB ต่อภาพ
        {multiple ? " · เลือกหลายภาพพร้อมกันได้" : ""}
      </p>
      <details>
        <summary>บันทึกที่มาและสิทธิ์ของภาพ (ไม่บังคับ)</summary>
        <div className="cms-field-grid">
          <label>
            แหล่งที่มาของภาพ
            <input
              value={source}
              maxLength={2000}
              disabled={disabled || busy}
              onChange={(event) => setSource(event.target.value)}
            />
          </label>
          <label>
            สิทธิ์การใช้งานภาพ
            <input
              value={license}
              maxLength={500}
              disabled={disabled || busy}
              onChange={(event) => setLicense(event.target.value)}
            />
          </label>
        </div>
      </details>
      {status && <p role="status">{status}</p>}
      {error && (
        <p role="alert" className="cms-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
