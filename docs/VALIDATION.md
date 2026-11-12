# ผลการตรวจ v1.0.0 — 12 พฤศจิกายน 2026

ใช้ข้อมูลทดสอบชั่วคราว แยกจาก .data สำหรับใช้งานจริง

| รายการ | ผล |
|---|---|
| npm ci และ production build | ผ่าน Node.js 24.22.1 |
| npm run dev | Vite middleware, React page และ API ผ่านใน Chromium แม้มี dist อยู่แล้ว |
| API 12 ชุด | ผ่านทั้งหมด ไม่มี skipped |
| Chromium browser 53 กรณี | ผ่านทั้งหมด ไม่มี JavaScript page errors |
| 5 หน้า × TH/EN × 1440/768/390px | ไม่พบแนวนอนล้น หรือรูปโหลดเสีย |
| axe-core WCAG 2 A/AA + WCAG 2.1 AA | ไม่พบ violation ใน 5 หน้าสาธารณะที่ตรวจ |
| Keyboard | skip link, เมนูมือถือ และนำทางผ่านลิงก์ผ่าน |
| CMS ผ่าน UI จริง | login, แก้หัวข้อ, อัปโหลด SVG, เปลี่ยนรูปหลัก, เปลี่ยนไอคอน/สี, บันทึก และแสดงผลหน้าบ้านผ่าน |
| สไตล์ส่วนกลาง | computed font size, letter spacing, line height และ color ตรงกันใน 4 หน้า หลังเปลี่ยนค่า |
| ฟอร์มติดต่อ TH/EN | ส่งผ่าน Chromium และพบ records ใน SQLite |
| ข่าว | CRUD, draft, กำหนดวันเผยแพร่ในอนาคต, search, filter และ pagination ผ่าน |
| Auth/security | CSRF/Origin, unauthorized access, session rotation, HttpOnly/SameSite, hash, เปลี่ยนรหัสผ่าน/เพิกถอน session, logout และ rate limit ผ่าน |
| Media | sanitize SVG script/onload/foreignObject/external refs, decode raster, ปฏิเสธไฟล์ปลอมและการย้อมสี raster ผ่าน |
| ข้อมูลเดิม/old client | revision conflict และ partial object/array patch เก็บ field ใหม่ที่ request ไม่ส่งมา ผ่าน |
| Migration/reopen | เปิด DB ซ้ำแล้ว schema version ไม่ซ้ำ เนื้อหา/contacts/media/sessions อยู่ครบ |
| Backup/restore | SQLite backup + uploads, SHA-256, integrity check, ปลายทางใหม่, reset sessions และปฏิเสธไฟล์ที่ถูกแก้ ผ่าน |
| CLI สร้าง admin | ทดสอบจริงใน Linux PTY การป้อน password ซ่อนและสร้างบัญชีสำเร็จ |
| Docker | build, HTTP/API, non-root user, named volume และข้อมูลอยู่หลังลบ/สร้าง container ใหม่ ผ่าน |
| Docker Compose | ตรวจ configuration ผ่าน; runtime persistence ทดสอบด้วย docker run กับ image เดียวกัน |
| npm audit --omit=dev | ไม่พบช่องโหว่ ณ วันที่ตรวจ |

## ขอบเขตที่ยังไม่ยืนยัน

- ยังไม่ได้ส่งอีเมลผ่าน SMTP จริง เพราะยังไม่มีบัญชี/ค่าเชื่อมต่อ การรับฟอร์มลงฐานข้อมูลผ่านแล้ว และ API/หลังบ้านแสดงสถานะ mail แยกต่างหาก
- ลิงก์ Google Maps ที่ผู้ใช้ให้ถูกนโยบายเครือข่ายคลาวด์ปฏิเสธ จึงยังไม่ได้อ่านพิกัด/ทดสอบ iframe ใช้ short link ที่ยืนยันแล้วเป็นปุ่มนำทางทั้งสองภาษา ปิด iframe จนยืนยันพิกัดจริง
- URL LinkedIn ต้องเติม; LINE/Facebook อนุมานจาก handles ในดีไซน์ ยังไม่ทดสอบปลายทางภายนอก
- ยังไม่ได้ทดสอบ Windows จริง, Safari, Firefox หรือ screen reader จริง (เช่น NVDA/VoiceOver) การผ่าน axe ไม่เท่ากับการรับรอง accessibility ทั้งหมด
- Desktop เทียบภาพด้วยสายตา ไม่ได้อ้าง pixel-perfect diff: ไม่มี font metadata และไฟล์ภาพแยกชิ้น Mobile/Tablet เป็น responsive adaptation; ปรับเทาส่วนกลางเล็กน้อยเพื่อให้ contrast ผ่าน
- PostgreSQL มีแนวทางย้าย ยังไม่ได้ติดตั้งหรือทดสอบ migration ไป PostgreSQL
- ยังไม่ได้ deploy สู่โดเมนสาธารณะ/ตั้ง TLS production และไม่ได้ push image ไป Docker registry
- การ restore snapshot ใน cloud task ใหม่หลัง Publish ยังไม่ได้ทดสอบ

คำสั่งทดสอบซ้ำอยู่ใน README; screenshots จากรอบล่าสุดสร้างใน test-results (ignored) การตรวจ SMTP และแผนที่ต้องทำใหม่หลังใส่ค่าจริง/เปิดสิทธิ์เครือข่าย
