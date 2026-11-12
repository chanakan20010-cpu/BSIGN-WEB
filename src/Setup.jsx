import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "./api";
export default function Setup() {
  const navigate = useNavigate();
  const [token] = useState(() => {
    const token = location.hash.slice(1);
    history.replaceState(null, "", location.pathname);
    return token;
  });
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("กำลังเตรียมพรีวิว…");
  useEffect(() => {
    let live = true;
    (async () => {
      await api("/session");
      if (!token) {
        if (live)
          setMessage("กด “จัดการเนื้อหา” ในหน้าต่างเปิดพรีวิว เพื่อสร้างบัญชีครั้งแรก");
        return;
      }
      const s = await api("/setup", { headers: { "X-BSIGN-Setup": token } });
      if (!live) return;
      if (!s.needsSetup) {
        navigate("/admin", { replace: true });
        return;
      }
      setReady(true);
      setMessage("");
    })().catch(
      () =>
        live &&
        setMessage("ลิงก์นี้หมดอายุแล้ว กรุณากด “จัดการเนื้อหา” ในหน้าต่างเปิดพรีวิวอีกครั้ง"),
    );
    return () => {
      live = false;
    };
  }, [token]);
  async function submit(e) {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.currentTarget));
    if (b.password !== b.confirm) {
      setMessage("รหัสผ่านทั้งสองช่องต้องตรงกัน");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api("/setup", {
        method: "POST",
        headers: { "X-BSIGN-Setup": token },
        body: { email: b.email, password: b.password },
      });
      navigate("/admin", { replace: true });
    } catch (e) {
      setMessage(
        e.message === "SETUP_COMPLETE"
          ? "มีบัญชีผู้ดูแลแล้ว กรุณาเข้าสู่ระบบ"
          : "สร้างบัญชีไม่สำเร็จ กรุณาตรวจอีเมลและรหัสผ่าน แล้วลองอีกครั้ง",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin login">
      <h1>พร้อมเปิดพรีวิว BSIGN TECH</h1>
      <p>ตั้งบัญชีของคุณเพื่อแก้ไขข้อความ รูปภาพ และข่าวสารได้จากหน้าเว็บ</p>
      {ready && (
        <form onSubmit={submit}>
          <label>
            อีเมลผู้ดูแล
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label>
            รหัสผ่านใหม่
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={200}
            />
          </label>
          <small>ใช้รหัสผ่านอย่างน้อย 12 ตัวอักษร</small>
          <label>
            ยืนยันรหัสผ่าน
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={200}
            />
          </label>
          <button disabled={busy}>
            {busy ? "กำลังสร้างบัญชี…" : "สร้างบัญชีและเปิดหลังบ้าน"}
          </button>
        </form>
      )}
      <p role="status">{message}</p>
      <div className="admin-actions">
        <Link to="/">ดูเว็บไซต์ก่อน</Link>
        <Link to="/admin">มีบัญชีแล้ว · เข้าสู่ระบบ</Link>
      </div>
      <p>ข้อมูลจะอยู่ในเครื่องของคุณเมื่อปิดและเปิดพรีวิวใหม่</p>
    </main>
  );
}
