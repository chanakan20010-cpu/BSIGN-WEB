# ผลการตรวจ v1.1.0 — 12 พฤศจิกายน 2026

ใช้ข้อมูลทดสอบชั่วคราวและรหัสผ่านสุ่ม ไม่แก้ข้อมูลผู้ใช้ใน `.data`

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1 |
| API 15 ชุด | ผ่านทั้งหมด รวม migration, backup/restore รูปและไอคอน, restart และ security เดิม |
| สร้างแอดมินครั้งแรก | ผ่านใน Chromium: ตั้งอีเมล/รหัสผ่าน ตรวจยืนยันรหัส เปิด CMS และใช้บัญชีเดิมหลัง restart |
| กู้บัญชีจากตัวเปิด | ผ่าน API และ Chromium: แสดงอีเมลเฉพาะผู้ถือ capability ตั้งรหัสใหม่ ยกเลิก session ปฏิเสธรหัสเก่า และเก็บเนื้อหาเดิม |
| จำกัดสิทธิ์ local preview | ผ่าน loopback/Host/capability/CSRF/Origin; token เปลี่ยนหลัง restart; เซิร์ฟเวอร์ปกติไม่มี setup/recovery endpoints |
| สร้างบัญชีพร้อมกัน | มีเพียง request เดียวสำเร็จ ไม่สร้างบัญชีเพิ่มหลัง setup |
| Chromium regression 53 กรณี | ผ่าน TH/EN, 5 หน้า, 1440/768/390px, ฟอร์มจริง, CMS, รูป, ไอคอน, computed styles, keyboard และ axe |
| Docker | build v1.1.0, HTTP/API, non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน |
| PowerShell | parse และ process arguments ที่มีช่องว่าง/ภาษาไทยผ่านใน PowerShell 7 บน Linux; ผล Windows แยกด้านล่าง |

Windows x64 ผ่านบน GitHub Actions `windows-2022` (Windows Server 2022, Windows PowerShell 5.1): ดาวน์โหลดและตรวจ SHA-256 ของ portable Node, ติดตั้ง dependencies, build, ใช้ cache, เปิด/หยุด/restart, หน้าต่าง WinForms, เรียก entry point `OPEN-PREVIEW.vbs`, API 15 ชุด และสร้างบัญชี/ตั้งรหัสใหม่/เข้า CMS ด้วย Microsoft Edge จริง ผ่านทั้งหมด

หลักฐาน: [Windows ZIP preview run #6](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/43220271668) — commit `d7d13e2`; ทดสอบจาก `git archive` ZIP ที่แตกใหม่ในโฟลเดอร์ที่มีช่องว่างและภาษาไทย โดยไม่อาศัยไฟล์จาก working tree หรือเครื่องมือที่ติดตั้งไว้ก่อน

ข้อจำกัดของการทดสอบ: ไม่ได้ทดสอบ Windows ARM64, เครื่ององค์กรที่ปิด scripting, SmartScreen/Mark-of-the-Web บนเครื่องผู้ใช้ หรือทุกเวอร์ชัน Windows 10/11; ต้องใช้อินเทอร์เน็ตเตรียมครั้งแรก การทดสอบบน CI ไม่รับรองนโยบายความปลอดภัยของแต่ละเครื่อง

SMTP, พิกัด iframe Maps, URL LinkedIn และการ deploy สาธารณะยังมีขอบเขตตามรายการด้านล่าง ไม่อ้างว่าเชื่อมต่อสำเร็จแล้ว

---

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
- ใน v1.0.0 ยังไม่ได้ทดสอบ Windows จริง (ดูผล v1.1.0 ด้านบน); Safari, Firefox และ screen reader จริง เช่น NVDA/VoiceOver ยังไม่ได้ทดสอบ การผ่าน axe ไม่เท่ากับการรับรอง accessibility ทั้งหมด
- Desktop เทียบภาพด้วยสายตา ไม่ได้อ้าง pixel-perfect diff: ไม่มี font metadata และไฟล์ภาพแยกชิ้น Mobile/Tablet เป็น responsive adaptation; ปรับเทาส่วนกลางเล็กน้อยเพื่อให้ contrast ผ่าน
- PostgreSQL มีแนวทางย้าย ยังไม่ได้ติดตั้งหรือทดสอบ migration ไป PostgreSQL
- ยังไม่ได้ deploy สู่โดเมนสาธารณะ/ตั้ง TLS production และไม่ได้ push image ไป Docker registry
- การ restore snapshot ใน cloud task ใหม่หลัง Publish ยังไม่ได้ทดสอบ

คำสั่งทดสอบซ้ำอยู่ใน README; screenshots จากรอบล่าสุดสร้างใน test-results (ignored) การตรวจ SMTP และแผนที่ต้องทำใหม่หลังใส่ค่าจริง/เปิดสิทธิ์เครือข่าย
