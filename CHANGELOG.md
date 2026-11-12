# Changelog

## v1.1.0 — 2026-11-12

- เพิ่มตัวเปิดพรีวิว Windows แบบหน้าต่าง ดับเบิลคลิกเพื่อดาวน์โหลด/ตรวจ Node.js portable ติดตั้ง dependencies และเปิดเบราว์เซอร์อัตโนมัติ
- ใช้พอร์ตว่างบน loopback มีปุ่มเปิดเว็บ หลังบ้าน และหยุด พร้อม cache สำหรับเปิดครั้งถัดไปและบันทึกข้อผิดพลาด
- เพิ่มหน้าสร้างบัญชีผู้ดูแลครั้งแรกผ่านเบราว์เซอร์ เฉพาะ local preview ที่มี capability และ CSRF; ปิดการสร้างเพิ่มหลังมีบัญชี และไม่เปิด endpoint นี้บนเซิร์ฟเวอร์ปกติ
- เพิ่มหน้าดูอีเมลบัญชีและตั้งรหัสผ่านใหม่ผ่านลิงก์จากตัวเปิดพรีวิวเท่านั้น พร้อมยกเลิก session เดิม โดยไม่ลบเนื้อหาหรือรูป
- รักษา .data, .env และ Node.js ที่มีอยู่ในเครื่อง ไม่ต้องพิมพ์คำสั่ง npm ด้วยตนเอง
- แก้ผลลัพธ์จาก PowerShell download ที่รบกวนค่าตั้งต้นของตัวเปิด และยืนยันเปิดครั้งแรก/restart ได้บน Windows จริง
- เพิ่มการทดสอบ preview/setup/recovery/restart และ workflow ตรวจ ZIP, Windows portable runtime, WinForms, VBS entry point และ Edge

## v1.0.0 — 2026-11-12

- เพิ่มเว็บไซต์ React/Vite TH/EN ทั้ง 5 หน้าจากภาพ UI ที่แนบ พร้อม responsive layout, navigation, ค้นหา/กรอง/แบ่งหน้าข่าว และแบบฟอร์มติดต่อ
- เพิ่ม Express API + SQLite, schema initialization, เนื้อหาเริ่มต้นจากดีไซน์และบทความเปิดตัวจาก Markdown
- เพิ่ม CMS แยกหน้า เนื้อหา/เมนู/ลิงก์/บริษัท/รูป/ฟอร์ม/สถานะ, หมวดข่าว draft/published และเวลาเผยแพร่
- เพิ่ม typography ส่วนกลางพร้อมขนาด responsive ตัวอย่างและ reset; สีหัวข้อแยกหน้า/บรรทัด; คลังไอคอน shared/override พร้อมที่มาของ social assets
- เพิ่ม scrypt password hashing, persistent session, CSRF, validation, rate limit, SVG sanitization และ revision conflict protection รวม partial patch
- เพิ่มกล่องข้อความติดต่อ รายชื่อ newsletter และสถานะ SMTP แยกจากการบันทึกฟอร์ม
- เพิ่ม backup/restore พร้อมรูป/ไอคอนและ checksum, Docker/Compose, START-WINDOWS.cmd, .env.example และเอกสารภาษาไทย
- ยืนยัน API 12 ชุด, browser 53 กรณี, Docker persistence และ automated accessibility; รายการที่ยังไม่ทดสอบระบุใน docs/VALIDATION.md

ข้อจำกัดภายนอก: รอ SMTP, พิกัดสำหรับ iframe Maps และ URL LinkedIn; ยังไม่ deploy สู่เว็บไซต์สาธารณะ
