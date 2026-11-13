# ผลการตรวจ v1.3.0 — 13 พฤศจิกายน 2026

ระบบหลังบ้านออกแบบใหม่สำหรับ BSIGN TECH ใช้ภาพที่ผู้ใช้แนบเป็นแนวทางการใช้งาน ไม่มีการนำเลย์เอาต์หรือแบรนด์ Three Roses มาใช้ ข้อมูลทดสอบทั้งหมดอยู่ในฐานข้อมูลชั่วคราวแยกจากข้อมูลผู้ใช้

| รายการ | ผล |
|---|---|
| npm ci / production build | ผ่าน Node.js 24.22.1 |
| API 23 ชุด | ผ่านทั้งหมด ไม่มี skipped รวม auth/CSRF, revision/partial update, migration/restart, backup/restore รูป, sanitize และ overview ใหม่ |
| Dashboard | จำนวนรายการและรายการล่าสุดจากฐานข้อมูลจริง; endpoint ต้องเข้าสู่ระบบ และไม่ส่ง password/path/credential |
| Admin UX 59 กรณีใน Chromium | ผ่าน login/show password, dashboard, ค้นหาเมนู, คำเตือนแบบร่าง, บันทึกหน้าแรกลง API, CRUD ข่าว, filter/pagination, SVG upload/sanitize, live style/icon preview และบันทึก |
| Responsive admin | ตรวจ 9 หมวดที่ 1440/768/390/320px ไม่พบ document แนวนอนล้น; ตารางเลื่อนภายในกรอบ |
| Keyboard / accessibility | drawer focus trap, Shift+Tab/Tab, Escape/คืน focus ผ่าน; axe WCAG A/AA ไม่พบ violation ใน login/dashboard/editor/articles/media และหน้ามือถือที่ตรวจ |
| Browser regression 53 กรณี | TH/EN, 5 หน้าสาธารณะ, รูป/overflow, public axe, ฟอร์มจริง, CMS edit/upload/icons, computed styles และ keyboard ผ่าน |
| Setup / account file | สร้างบัญชีเองและกู้บัญชีผ่านหน้าที่ออกแบบใหม่ผ่าน; initial-admin login/logout และเข้าอีกครั้งหลัง restart ผ่าน |
| Docker / Compose | build v1.3.0 ผ่าน, HTTP/API/non-root/volume persistence ผ่าน, Compose config ผ่าน |
| การตรวจภาพ | ดูภาพ login/dashboard/editor/mobile จริงแล้ว; ตัวอย่างจากฐานข้อมูลเริ่มต้นอยู่ใน docs/screenshots ไม่มีรหัสผ่านในภาพ |

Windows Server 2022 x64 / PowerShell 5.1 ผ่าน [Windows preview run #13](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/43351823292) — implementation commit `f1bf856`:

- แตก source ZIP ในโฟลเดอร์ที่มีช่องว่างและภาษาไทย ติด Internet Zone ให้สคริปต์เพื่อจำลองไฟล์ดาวน์โหลด
- ยืนยันการบล็อกแบบเดิม ปฏิเสธไฟล์ที่แก้แล้วก่อนปลดบล็อก และเปิด START-WINDOWS พร้อม login/restart ด้วยบัญชีจากไฟล์ได้
- เปิด GUI/VBS จากไฟล์ที่ติด Internet Zone ได้ โดยไม่เปลี่ยน Execution Policy ถาวร และไม่ปลดบล็อกไฟล์อื่น
- API ทั้ง 23 ชุด ผ่าน; Edge browser สำหรับ setup/recovery, initial-admin และ Admin UX 59 กรณี ผ่านทั้งหมด

CI ใช้ Edge headless และจำลอง Mark-of-the-Web ที่ไฟล์ที่แตกแล้ว ไม่ใช่การรัน Explorer หรือ screen reader บนเครื่องผู้ใช้จริง

ข้อจำกัด: การผ่าน axe และ keyboard ไม่เท่ากับการทดสอบ screen reader จริง เช่น NVDA/VoiceOver; ยังไม่ได้ตรวจ Safari/Firefox หรือ Windows ARM64 หน้า System แสดงสถานะและคู่มือสำรอง ไม่ได้เพิ่มปุ่ม backup/restore ที่ทำงานบนเว็บ SMTP จริง, iframe Maps และ LinkedIn ยังต้องเติมข้อมูล/ทดสอบบริการตามขอบเขตเดิมด้านล่าง ไม่มีการ deploy สู่โดเมนสาธารณะหรือ push Docker image ไป registry ในรอบนี้

---

# ผลการตรวจ v1.2.1 — 12 พฤศจิกายน 2026

แก้ข้อผิดพลาด RemoteSigned เมื่อไฟล์ .ps1 มี Mark-of-the-Web จาก ZIP ที่ดาวน์โหลด การทดสอบ v1.2.0 ก่อนหน้านี้ไม่ได้ติด Internet Zone ให้ไฟล์ จึงไม่ครอบคลุมข้อผิดพลาดนี้

| รายการ | ผล |
|---|---|
| Inline launcher | ตรวจ syntax และ hash จริงใน PowerShell ผ่าน; generator --check ผ่าน |
| Build | production build ผ่าน Node.js 24.22.1 |
| Docker v1.2.1 | build, HTTP/API, non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน |

Windows Server 2022 x64 / Windows PowerShell 5.1 ผ่าน [Windows MOTW regression run #11](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/43228292071) — implementation commit `b6c1fc4`:

- ติด NTFS Zone.Identifier, ZoneId=3 ให้สคริปต์ทั้ง 4 ไฟล์ แล้วเรียกแบบ RemoteSigned เดิม ยืนยันว่าเกิด SecurityError/UnauthorizedAccess ก่อนแก้
- แก้ bytes ของ console.ps1 แล้วเรียก START-WINDOWS: ถูกปฏิเสธด้วย hash mismatch และทุกไฟล์ยังติด mark อยู่
- คืนไฟล์ที่ถูกต้องแต่คง Internet Zone แล้วเรียก START-WINDOWS: เตรียม Node/dependencies/build, เปิด HTTP, อ่าน initial-admin, ล็อกอิน CMS และ restart ผ่าน
- ตรวจว่า mark ถูกลบเฉพาะสคริปต์ที่กำหนด ไฟล์ .ps1 อื่นยังมี mark และ execution policy ก่อน/หลังตรงกัน
- ติด mark ใหม่แล้วเรียก OPEN-PREVIEW.vbs: GUI เปิด/ปิด server ได้ผ่าน entry point จริง
- Generator hash check, API ทั้ง 21 ชุด และ Edge browser สำหรับ setup/recovery กับบัญชีจากไฟล์ initial-admin ผ่านทั้งหมด

เป็นการจำลอง metadata บนไฟล์ที่แตกจาก ZIP แล้ว ไม่ได้อ้างว่าได้ดาวน์โหลดผ่าน browser และแตก ZIP ด้วย Explorer บนเครื่องผู้ใช้จริง

ขอบเขต path: รอบส่งมอบใช้โฟลเดอร์ที่มีช่องว่างและภาษาไทย การลองโฟลเดอร์ที่มี `[]` พบปัญหา resolve path ของ PowerShell และการลอง `&/!` ยังไม่ผ่านขั้นเตรียมระบบ จึงไม่อ้างว่ารองรับชื่อเหล่านี้ ให้ใช้ชื่อโฟลเดอร์ปกติเช่น `BSIGN-WEB-1.2.1`

การตรวจ hash เป็นการตรวจความครบชุดของไฟล์ในรุ่น ไม่ใช่ลายเซ็นจากผู้เผยแพร่ ตัวเปิดใช้ Unblock-File เฉพาะสคริปต์ 4 ไฟล์ที่ตรวจ hash ครบแล้ว ไม่เปลี่ยน Execution Policy ถาวร และไม่ข้าม Group Policy ที่บังคับลายเซ็น เครื่ององค์กรที่ใช้ AllSigned/AppLocker อาจยังต้องให้ฝ่ายไอทีอนุญาต Windows ARM64, SmartScreen และการดาวน์โหลด/แตก ZIP ด้วย Explorer จริงบนเครื่องผู้ใช้ยังไม่ใช่ขอบเขตการทดสอบในคลาวด์

---

# ผลการตรวจ v1.2.0 — 12 พฤศจิกายน 2026

ใช้ฐานข้อมูลและบัญชีชั่วคราว ไม่สร้างรหัสผ่านทดสอบลง .data ที่ใช้จริง

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1 |
| API 21 ชุด | ผ่านทั้งหมด ไม่มี skipped รวม migration, backup/restore, restart และชุด initial-admin 6 ชุด |
| initial-admin | สร้างบัญชีสุ่มเฉพาะ DB ว่าง ล็อกอินจริงได้ ไฟล์/บัญชีอยู่หลัง restart; บัญชีเดิมไม่ถูกเปลี่ยน |
| ความปลอดภัยไฟล์บัญชี | ไม่ส่ง password ผ่าน readiness/log/HTTP; exclusive create, rollback cleanup และปฏิเสธไฟล์เดิมเมื่อ DB ไม่มีบัญชีผ่าน |
| เปิดพร้อมกัน | ได้บัญชีเดียวและไฟล์ที่ล็อกอินได้ ไม่เขียนทับกัน |
| Browser ตามขั้นตอนผู้ใช้ | Chromium: หน้าแรก → เติม /admin → ใช้ Username/Password จากไฟล์ → CMS → logout → restart → login อีกครั้ง ผ่าน |
| ตัวเลือก GUI เดิม | สร้างบัญชีเอง, ยืนยันรหัส, เข้าสู่ CMS, ปิด setup หลังมีบัญชี และกู้รหัสผ่านผ่าน browser ผ่าน |
| Browser regression 53 กรณี | TH/EN, 5 หน้า, 1440/768/390px, ฟอร์ม, CMS, รูป, ไอคอน, สไตล์กลาง, keyboard และ axe ผ่าน |
| Docker v1.2.0 | build, HTTP/API, non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน |
| PowerShell | parse สคริปต์และ compile helper สำหรับอายุ process ผ่านใน Linux; ใช้งาน helper กับ server จริงผ่าน Windows CI |

Windows x64 / PowerShell 5.1 ผ่าน [Windows ZIP preview run #8](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/43225215666) — implementation commit `131afe9`:

- แตก ZIP จาก git archive ลงโฟลเดอร์ที่มีช่องว่างและอักษรไทย
- เรียก START-WINDOWS.cmd -SmokeTest โดยใช้ Node portable ที่ดาวน์โหลดและตรวจ checksum ใหม่ ติดตั้ง dependencies และ build จริง
- CMD แสดง readiness, สร้าง initial-admin.txt, ใช้บัญชีจากไฟล์ล็อกอิน API แล้วอ่าน CMS ได้ เปิดซ้ำไม่ rebuild และไฟล์บัญชีไม่เปลี่ยน
- ตัวเลือก WinForms/VBS เดิมยังเปิดได้ และ API ทั้ง 21 ชุดผ่าน
- Microsoft Edge: ใช้ Username/Password จากไฟล์ที่สร้างจริง เข้า /admin, logout และเข้าอีกครั้งหลัง restart ผ่าน รวม browser setup/recovery แบบเดิม

ขั้นตอน browser ของ CI ใช้ Edge แบบ headless แยกจากการเรียก default browser ของเครื่องผู้ใช้

ขอบเขตที่ยังไม่ทดสอบ: Windows ARM64, Windows 10/11 ทุก build, Mark-of-the-Web/SmartScreen และนโยบายเครื่ององค์กร; ผล CI ใช้ Windows Server 2022 x64 ไม่เท่ากับทดสอบเครื่องผู้ใช้ทุกเครื่อง บริการ SMTP จริง, พิกัดแผนที่ iframe, URL LinkedIn และ deploy สาธารณะยังมีข้อจำกัดตามรายการด้านล่าง

---

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
