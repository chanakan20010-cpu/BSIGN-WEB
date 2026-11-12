import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "./api";
export default function Setup() {
  const navigate = useNavigate();
  const recovery = new URLSearchParams(location.search).get("recover") === "1";
  const [accounts, setAccounts] = useState([]);
  const [done, setDone] = useState(false);
  const [token] = useState(() => {
    const token = location.hash.slice(1);
    history.replaceState(null, "", location.pathname + location.search);
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
      if (!s.needsSetup && !recovery) {
        navigate("/admin", { replace: true });
        return;
      }
      if (recovery && s.needsSetup) {
        location.replace("/setup#" + token);
        return;
      }
      if (recovery) {
        const result = await api("/local-account", {
          headers: { "X-BSIGN-Setup": token },
        });
        if (!live) return;
        setAccounts(result.accounts);
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
  }, [token, recovery]);
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
      await api(recovery ? "/local-account" : "/setup", {
        method: "POST",
        headers: { "X-BSIGN-Setup": token },
        body: { email: b.email, password: b.password },
      });
      if (recovery) {
        setDone(true);
        setReady(false);
        setMessage("ตั้งรหัสผ่านใหม่แล้ว ใช้อีเมลที่เลือกกับรหัสผ่านใหม่เพื่อเข้าสู่ระบบ");
      } else navigate("/admin", { replace: true });
    } catch (e) {
      setMessage(
        e.message === "SETUP_COMPLETE"
          ? "มีบัญชีผู้ดูแลแล้ว กรุณาเข้าสู่ระบบ"
          : "บันทึกบัญชีไม่สำเร็จ กรุณาตรวจอีเมลและรหัสผ่าน แล้วลองอีกครั้ง",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin login">
      <h1>{recovery ? "ตั้งรหัสผ่านแอดมินใหม่" : "สร้างบัญชีแอดมิน BSIGN TECH"}</h1>
      <p>
        {recovery
          ? "เลือกบัญชีในเครื่องนี้แล้วตั้งรหัสผ่านใหม่ ข้อมูลเว็บไซต์จะคงอยู่ และทุกบัญชีจะออกจากระบบ"
          : "ไม่มี username หรือ password สำเร็จรูป ตั้งอีเมลและรหัสผ่านของคุณเอง อีเมลนี้ใช้เป็นชื่อเข้าสู่ระบบ"}
      </p>
      {ready && (
        <form onSubmit={submit}>
          <label>
            อีเมลผู้ดูแล
            {recovery ? (
              <select name="email" required>
                {accounts.map((a) => (
                  <option key={a.email} value={a.email}>
                    {a.email}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                maxLength={254}
              />
            )}
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
            {busy
              ? "กำลังบันทึก…"
              : recovery
                ? "ตั้งรหัสผ่านใหม่และออกจากทุกอุปกรณ์"
                : "สร้างบัญชีและเปิดหลังบ้าน"}
          </button>
        </form>
      )}
      <p role="status">{message}</p>
      <div className="admin-actions">
        <Link to="/">ดูเว็บไซต์ก่อน</Link>
        <Link to="/admin">
          {done ? "เข้าสู่ระบบด้วยรหัสผ่านใหม่" : "มีบัญชีแล้ว · เข้าสู่ระบบ"}
        </Link>
      </div>
      <p>ข้อมูลจะอยู่ในเครื่องของคุณเมื่อปิดและเปิดพรีวิวใหม่</p>
    </main>
  );
}
