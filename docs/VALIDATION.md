# ผลการตรวจ v1.8.0 — 23 พฤศจิกายน 2026

รายการเทียบคำขออยู่ใน [REVISION-05.md](REVISION-05.md) ทดสอบด้วยฐานข้อมูล บัญชี และไฟล์ชั่วคราว ไม่แก้ `.data`/`.env` ของผู้ใช้ ภาพตัวอย่างใช้ค่าทดสอบและไม่ใช่การเปลี่ยนสีข้อมูลเดิมอัตโนมัติ

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1 และตรวจรูปแบบไฟล์/launcher hashes ผ่าน |
| API 54 ชุด | ผ่าน รวม 5 ชุดใหม่สำหรับ HEX/inherit, ป้องกัน CSS ไม่อนุญาต, รักษา validation สีไอคอน/สไตล์เดิม, partial client, บทความ, restart และ backup/restore |
| Browser เดิม 325 กรณี | ผ่าน Public 53, Admin 82, Contact 33, revision 01/02/03 จำนวน 40/36/42, Fonts 10, Identity 11 และ revision 04 จำนวน 18 |
| Browser ใหม่ 17 กรณี | ผ่าน Header/Footer active 700 และ inactive 400 รวม formatted labels บน TH desktop/EN mobile ทั้ง 5 routes; ตัวกรองข่าวทั้ง TH/EN |
| ปกข่าวเด่น | หัวข้อ/คำโปรยยาว TH/EN บน Desktop/Mobile สูงไม่เกิน 3 บรรทัดพร้อมจุดไข่ปลา ข้อความสั้นไม่เว้นพื้นที่เพิ่ม ตรวจชื่อและเนื้อหาเต็มในบทความและ API |
| ไอคอนติดต่อ | 7 ตำแหน่งข้อมูลติดต่อ/โซเชียล/สำนักงานเป็น 40×40 และ glyph 22×22 ที่ 1440/768/390/320px โดยไม่เปลี่ยนสี/พื้นหลัง |
| สีข้อความรายช่อง | ผ่าน preview, เลือก/บันทึก/โหลดใหม่, สีทั้งสองส่วนของชื่อแบรนด์, หัวข้อรายบรรทัดที่มีสีเดิม, หัวข้อ/คำโปรย/ย่อหน้าบทความ, placeholder แบบ native, TH/EN, reset และค่าหลัง restart; สไตล์กลางอยู่เดิม |
| Accessibility | Public เดิมทั้ง 5 หน้าและ Admin regression ผ่าน automated axe WCAG A/AA ตามเกณฑ์ชุดทดสอบ; ชุดใหม่เปิดตัวเลือกสี ไม่พบ serious/critical violations |
| บัญชีพรีวิว | setup/recovery และ initial-admin → /admin → logout → restart → login ผ่านอีก 2 flow |
| Docker / Compose | build v1.8.0 ผ่าน; HTTP/API, non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน; Compose config ผ่าน |
| ภาพตัวอย่าง | docs/screenshots/v180-*.png ตรวจภาพจริงแล้ว ใช้ข้อมูลและสีทดสอบ ไม่แสดงรหัสผ่าน |

รวม browser ตามชุดหลัก 342 กรณี ไม่รวม 2 flow บัญชีพรีวิว ไม่มี migration ใหม่ ข้อความเต็มไม่ถูกตัดในฐานข้อมูล และสีเฉพาะข้อความเป็นฟิลด์เสริมที่เก็บร่วมกับเนื้อหานั้น

ข้อจำกัดเดิมเรื่อง screen reader จริง/Windows ARM64, การเชื่อม SMTP จริง, พิกัด iframe Maps และบัญชี LinkedIn ยังเป็นไปตามรุ่นก่อน ไม่มีการเพิ่มบริการเสียเงินหรือ deploy โดเมนสาธารณะ

---

# ผลการตรวจ v1.7.0 — 20 พฤศจิกายน 2026

รายการเทียบคำขอใน [REVISION-04.md](REVISION-04.md) ทดสอบด้วยบัญชี ฐานข้อมูล และไฟล์ชั่วคราว ไม่แก้ `.data`/`.env` ของผู้ใช้ ชุด browser รวม 325 ข้อ และการตรวจ accessibility เพิ่ม 8 หน้าจอ ภาพตัวอย่างรุ่นนี้อยู่ใน docs/screenshots/v170-*.png

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1 |
| API 49 ชุด | ผ่าน รวมฟอนต์/CSRF/auth/parser/ขนาด/ข้อมูลสาธารณะ, migration 4–5, client เก่า, social/iconStyle/สีการ์ด, adminPresentation allowlist, restart และ backup/restore พร้อม bytes/metadata ของฟอนต์ |
| ความปลอดภัยของ backup/restore | ผ่านกรณี legacy backup, checksum/ไฟล์ไม่ตรงฐานข้อมูล, path traversal, symlink, ขนาดเกิน และไม่เขียนทับปลายทางที่มีอยู่ รวมชื่อรูปเก่าที่ไม่ได้เป็น UUID และปิด SQLite ก่อนล้าง backup ที่ล้มเหลวเพื่อรองรับ Windows |
| ฟอนต์ใน browser 10 กรณี | ผ่านรายการ 20 แบบพร้อม faces/น้ำหนักจริง, อัปโหลดผ่าน UI, preview แบบร่างยังไม่บันทึก, computed font + CDP ยืนยัน glyph ฟอนต์ที่อัปโหลดจริงบน Desktop/Mobile, restart และป้องกันลบที่ใช้อยู่/ลบหลังปลดการอ้างอิง |
| แบรนด์/Login 11 กรณี | ผ่านโลโก้จริง/ข้อมูลบริษัท ข้อความและสถานะ Login, preview, Desktop/Mobile, maintenance, setup/recovery แยกหัวข้อ, restart และแก้ข้อมูลเก่าที่มี unknown key โดยไม่ล้างหรือเผยแพร่ key นั้น |
| Contact/สีการ์ด 18 กรณี | ผ่านเลือกโซเชียล 20 แบบ ไอคอน/สี/เรียงลำดับตามข้อมูล, ช่องกรอกและสถานะ TH/EN, custom invalid โดยไม่ส่งฟอร์มที่ขาดข้อมูล, ส่งจริงเข้ากล่องข้อความและใช้ success ที่แก้ไว้, สีการ์ดรายใบ preview/reset/save และ restart |
| หน้าบ้านเดิม 53 กรณี | ผ่าน TH/EN ทั้ง 5 หน้า responsive, ฟอร์ม, edit/upload/icons, computed typography, keyboard และ automated accessibility |
| หลังบ้านเดิม 82 กรณี | ผ่าน CRUD, อัปโหลด, สลับภาษา/บันทึกทั้งสองภาษา, sticky ถึงท้ายบทความ, responsive/keyboard/axe |
| หัวข้อ Contact 33 กรณี | ผ่าน 1440/768/390/320px TH/EN, หัวข้อไม่มีกรอบและจัดกึ่งกลาง, สไตล์กลาง 24/22/20px ปรับ/preview/reset ผ่าน CMS, dropdown และข้อมูลหลัง restart |
| รายการแก้ไขเดิม 118 กรณี | revision 01 จำนวน 40, revision 02 จำนวน 36 และ revision 03 จำนวน 42 ผ่าน รวมข้อความ/ไอคอน/บทความ/รูป/แกลเลอรี/header/footer/maintenance และข้อมูลหลัง restart |
| เปิดพรีวิว/บัญชี | setup/recovery และ initial-admin → /admin → logout → restart → login ผ่าน ตัวเปิดทั้ง 4 ไฟล์ผ่านการตรวจ hash |
| การเข้าถึงหน้าจอใหม่ 8 หน้าจอ | fonts/adminPresentation/contact/home ที่ 1440 และ 390px ผ่าน automated axe WCAG A/AA โดยไม่มี violations หลังปรับสีข้อความว่างในคลังฟอนต์ให้ชัดเจน |
| Docker / Compose | build v1.7.0 ผ่านหลังเพิ่มไฟล์ shared ที่ใช้ทั้ง browser/server; HTTP/API/non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน; Compose config ผ่าน |

ตรวจพบว่า `git archive` บน Windows แปลงบรรทัดในใบอนุญาตฟอนต์ ทำให้ hash ไม่ตรงกับต้นทาง จึงกำหนด `.gitattributes` ให้คง bytes ของใบอนุญาต/ไฟล์ social ต้นฉบับ และตรวจ ZIP ด้วย `core.autocrlf=true` เพิ่ม

ชุดทดสอบฟอนต์ตรวจ WOFF/WOFF2/TTF ที่ใช้งานได้จริง โครงสร้างผิด ชนิดไฟล์ปลอม และ payload ที่ขยายเกิน 32 MB มีการอ่าน CFF OTF ตัวอย่างจริงในขั้นตรวจ parser ด้วย ไฟล์ที่รวมหลายฟอนต์ (TTC) ไม่รองรับ

ข้อจำกัดเดิม: ไม่ได้ทดสอบ screen reader จริงหรือ Windows ARM64; SMTP จริงยังไม่ได้เชื่อม/ส่งทดสอบ หมุด iframe Maps ยังไม่เปิดจนยืนยันพิกัดได้ แต่ปุ่มนำทางใช้ลิงก์ที่ผู้ใช้ให้ LinkedIn ยังต้องระบุบัญชีจริง ไม่มีการเพิ่มบริการเสียเงินหรือ deploy โดเมนสาธารณะ

Windows Server 2022 x64 / PowerShell 5.1 ผ่าน [Windows preview](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/44698221964) — implementation commit `dc7e5db1bc515fd4a13c83baf76b23ca113152a0`, workflow Success (4 นาที 16 วินาที), job succeeded (4 นาที 13 วินาที)

- แตก source ZIP ลงโฟลเดอร์ที่มีช่องว่าง/ภาษาไทย ตรวจ START-WINDOWS, Internet Zone/tamper rejection, portable Node และ GUI/VBS ผ่าน
- API 49 ชุด, Edge browser 272 กรณี (Admin 82, revision 01/02/03 จำนวน 40/36/42, Contact 33, Fonts 10, Identity 11 และ revision 04 จำนวน 18) รวมทั้ง setup/recovery และ initial-admin อีก 2 กรณี ผ่านตามขั้นตอน workflow
- แก้จังหวะชุดทดสอบให้รอ React แสดงฟอร์ม รอ PATCH ยืนยันการบันทึก และรอการย้ายรายการเสร็จ โดยยังตรวจข้อมูลครบก่อน/หลัง restart
- ยืนยันสถานะจากหน้า workflow/job สาธารณะ ไม่ได้อ่าน log ที่ต้องเข้าสู่ระบบ CI ใช้ Edge headless และจำลอง Mark-of-the-Web บนไฟล์ที่แตกแล้ว ไม่เท่ากับการทดสอบ Explorer หรือเครื่องผู้ใช้จริง

---

# ผลการตรวจ v1.6.3 — 17 พฤศจิกายน 2026

เพิ่มเงาภาพหลักและภาพส่วนทำไมต้องเลือกเราในหน้าแรกด้วยกฎ CSS ร่วมกับการ์ดภาพหน้าเกี่ยวกับเรา ค่า `0 10px 15px #0002` คงมุมโค้งและตำแหน่งป้ายข้อความเดิม ไม่มีการแก้ API หรือ migration

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1 |
| Public browser 53 กรณี | ผ่าน TH/EN ทั้ง 5 หน้า, responsive, ฟอร์ม, แก้ข้อมูล/อัปโหลด/ไอคอนผ่าน CMS, computed typography, keyboard และ automated accessibility |
| ตรวจเงา 12 สถานการณ์ | ภาพเดิมแบบ SVG crop และ JPEG ที่อัปโหลด/บันทึกผ่าน API จริงด้วยบัญชีชั่วคราว × TH/EN × 1440/768/390px ผ่าน; เงาของภาพทั้งสองตรงกับ computed shadow ของหน้าเกี่ยวกับเรา และไม่มีหน้าล้น |
| รูปแบบเดิม | border-radius ของภาพยังเป็น 8px ป้ายข้อความบนภาพและสัดส่วนภาพใช้กติกาเดิม |
| ภาพตัวอย่าง | docs/screenshots/home-hero-shadow.png และ home-team-shadow.png จากเว็บที่รันจริงด้วยข้อมูลชั่วคราว |
| Docker / Compose | build v1.6.3 ผ่าน; HTTP/API/non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน; Compose config ผ่าน |

Windows Server 2022 x64 / PowerShell 5.1 ผ่าน [Windows preview](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/44046260294) — implementation commit `c139bbfa45e74ef7d35d774211fcbb9f8d415ad7`, workflow Success (3 นาที 46 วินาที), job succeeded (3 นาที 42 วินาที)

- ZIP/START-WINDOWS, Mark-of-the-Web/tamper rejection, portable Node, GUI/VBS, initial-admin และ setup/recovery ผ่านตาม workflow
- API 36 ชุด, Edge Admin 82 และ revision 01/02/03 จำนวน 40/36/42 ผ่าน ยืนยันจากสถานะ workflow/job สาธารณะ ไม่ได้อ่าน log ที่ต้องเข้าสู่ระบบ
- CI ใช้ Edge headless และจำลอง Internet Zone บนไฟล์ที่แตกแล้ว ไม่เท่ากับการทดสอบ Explorer หรือเครื่องผู้ใช้จริง

ทดสอบด้วยฐานข้อมูลและไฟล์ชั่วคราว ไม่แก้ `.data` หรือ `.env` ที่มีอยู่ ข้อจำกัดบริการภายนอกและอุปกรณ์ที่ยังไม่ได้ทดสอบเป็นไปตามรุ่นก่อนด้านล่าง

---

# ผลการตรวจ v1.6.2 — 17 พฤศจิกายน 2026

รวมตัวสลับภาษา TH/EN ไว้ใน container เดียวกับตั้งค่าการเผยแพร่ตามคำขอล่าสุด ฝั่งขวาบน Desktop และเหนือเนื้อหาบน Tablet/Mobile ทดสอบด้วยฐานข้อมูลและบัญชีชั่วคราว โดยไม่แก้ `.data` หรือ `.env` ที่มีอยู่

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1 |
| Admin browser 82 กรณี | ผ่าน รวมฟังก์ชันเดิม, ภาษาและการเผยแพร่ในการ์ดเดียว, ปุ่มภาษาชุดเดียว, ค้างขณะเลื่อนถึงเนื้อหา/แกลเลอรี/สุดหน้า, คลิกสลับ TH/EN จริง และข้อความทั้งสองภาษาอยู่ครบหลังบันทึก |
| Responsive | ตรวจ 1440×720, 768×1000, 390×1000 และ 320×1000; จอเล็กเปิด/พับตั้งค่าการเผยแพร่ได้ ปุ่มภาษาไม่ถูกเมนูมือถือบัง และเลื่อนภายในส่วนตั้งค่าถึงปุ่มบันทึกได้โดยปุ่มภาษายังแสดง |
| Accessibility | keyboard/focus และ automated axe WCAG A/AA ผ่าน รวมหน้าแก้ไขบทความ ไม่ได้ทดสอบด้วย screen reader จริง |
| API 36 ชุด | ผ่าน รวม migration/partial updates/restart และ backup/restore พร้อมภาพตาม regression เดิม ไม่มีการแก้ API หรือเพิ่ม migration ในรุ่นนี้ |
| บัญชีพรีวิว | setup/recovery และ initial-admin → /admin → logout → restart → login ผ่าน ตัวเปิดทั้ง 4 ไฟล์ผ่านการตรวจ hash |
| Docker / Compose | build v1.6.2 ผ่าน, HTTP/API/non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน; Compose config ผ่าน |
| ตรวจภาพ | ภาพ Desktop/Mobile ใน docs/screenshots/article-language-*.png มาจากการรันจริงด้วยข้อมูลชั่วคราว ไม่แสดงรหัสผ่าน |

Windows Server 2022 x64 / PowerShell 5.1 ผ่าน [Windows preview run #20](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/44041373919) — implementation commit `80a8d518adf6dcda772ee112c2778ab264f626d8`, workflow Success (2 นาที 56 วินาที), job succeeded (2 นาที 54 วินาที):

- source ZIP แตกลง path ที่มีช่องว่างและภาษาไทย ผ่าน START-WINDOWS, Mark-of-the-Web/tamper rejection, portable Node, initial-admin login/restart และ WinForms/GUI/VBS ตามขั้นตอนใน workflow
- API 36 ชุด, setup/recovery, initial-admin และ Edge browser Admin 82, revision 01 จำนวน 40, revision 02 จำนวน 36 และ revision 03 จำนวน 42 ผ่าน
- ยืนยันสถานะจากหน้า workflow/job สาธารณะ ไม่ได้อ่าน log ที่ต้องเข้าสู่ระบบ ใช้ Edge headless และจำลอง Mark-of-the-Web บนไฟล์ที่แตกแล้ว ยังไม่เท่ากับการทดสอบ Explorer หรือเครื่องผู้ใช้จริง

การตรวจ Windows รอบแรกพบว่าขอบเขตของ sticky ที่ท้ายฟอร์มดันการ์ดขึ้นจนปุ่มภาษาอาจหลุดจอ แก้โดยคำนวณพื้นที่ส่วนท้ายหลังบ้านจริง และเพิ่ม regression ที่เลื่อนทันทีถึงท้ายเอกสารทั้ง 4 ขนาดจอ เพื่อไม่ให้การเลื่อนแบบ smooth ทำให้ตรวจผ่านก่อนถึงตำแหน่งสุดท้าย

ข้อจำกัดเดิมเรื่อง Windows ARM64, screen reader จริง, SMTP, iframe Maps และ LinkedIn ยังเป็นไปตามผลตรวจรุ่นก่อนด้านล่าง ไม่มีการ deploy โดเมนสาธารณะหรือ push Docker image ไป registry

---

# ผลการตรวจ v1.6.1 — 17 พฤศจิกายน 2026

แก้ตามภาพและรายงานหลังทดลองพรีวิว v1.6.0 รายการเทียบคำขออยู่ใน [REVISION-03.md](REVISION-03.md) ไฟล์ ZIP ที่ผู้ใช้แนบเกินขีดจำกัดนำเข้า 32 MiB จึงไม่ได้ทดสอบฐานข้อมูลเฉพาะในไฟล์นั้น ใช้โค้ด v1.6.0 และข้อมูลชั่วคราวที่จำลองกรณีจริง โดยไม่แก้ `.data` ของผู้ใช้

| รายการ | ผล |
|---|---|
| Build | ผ่าน Node.js 24.22.1 |
| API 36 ชุด | ผ่าน รวมสร้าง URL เมื่อไม่ส่ง/เว้นว่าง/ใส่ขีดกลาง, ชื่อซ้ำ/ชื่อไทย/ความยาว, ป้องกัน URL ไม่ปลอดภัย, คง URL เดิมเมื่อแก้ไข, limit ที่ไม่ขึ้นกับจำนวนข่าวต่อหน้า และข้อมูลหลัง restart |
| Browser เดิม 190 กรณี | Admin 61, หน้าบ้าน 53, revision 01 จำนวน 40 และ revision 02 จำนวน 36 ผ่าน รวม TH/EN, responsive, computed styles, ฟอร์มจริง, keyboard และ axe |
| Browser แก้ไขรอบนี้ 42 กรณี | ผ่าน 3 ข่าวล่าสุดต่างหมวดเมื่อยังมีตัวกรองหน้าแรกเดิมและตั้งหน้าข่าว pageSize=1; ไม่แสดงฉบับร่าง/ข่าวอนาคต/ข่าวเก่าที่อยู่นอก 3 ล่าสุด |
| สร้างบทความผ่าน UI | เว้นลิงก์ว่างแล้วบันทึกได้ เปิด URL ที่ระบบสร้างเพื่ออ่านเนื้อหาจริงได้ทั้ง TH/EN |
| แกลเลอรี | อัปโหลด 4 ภาพ แสดง 3 ภาพแถวแรกและภาพที่ 4 แถวถัดไปบน Desktop; Tablet/Mobile เป็น 2/1 คอลัมน์ ภาพกรอบ 4:3 ไม่ล้นจอ แก้คำอธิบาย TH/EN จัดลำดับ ลบ และเก็บรูปหลัง restart ผ่าน |
| ตรวจภาพ | ตรวจภาพข่าวล่าสุดและแกลเลอรีจริงจากข้อมูลชั่วคราว ภาพใน docs/screenshots ไม่แสดงรหัสผ่าน |
| บัญชีพรีวิว | browser setup/recovery และ initial-admin → /admin → logout → restart → login ผ่าน |
| Docker / Compose | build v1.6.1 ผ่าน, HTTP/API/non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน; Compose config ผ่าน |

Windows Server 2022 x64 / PowerShell 5.1 ผ่าน [Windows preview run #17](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/44011861428) — implementation commit `b184396ed35f87d6c09847087653781ca72f6bfe`, workflow Success (3 นาที 59 วินาที), job succeeded (3 นาที 56 วินาที):

- source ZIP แตกลงโฟลเดอร์ที่มีช่องว่างและภาษาไทย ตรวจ START-WINDOWS/Internet Zone/tamper rejection, portable Node, initial-admin login/restart และ WinForms/GUI/VBS โดยไม่เปลี่ยน Execution Policy ถาวร
- API 36 ชุด และ Edge browser สำหรับ setup/recovery, initial-admin, Admin 61, revision 01 จำนวน 40, revision 02 จำนวน 36 และ revision 03 จำนวน 42 ผ่านตามขั้นตอนที่กำหนดใน workflow
- ยืนยันสถานะจากหน้า workflow/job สาธารณะ ไม่ได้อ่าน log ที่ต้องเข้าสู่ระบบ CI ใช้ Edge headless และจำลอง Mark-of-the-Web บนไฟล์ที่แตกแล้ว ไม่เท่ากับการทดสอบ Explorer หรือเครื่องผู้ใช้จริง

ไม่มี migration ใหม่ และไม่เปลี่ยน URL หรือข้อมูลของบทความเดิมทั้งหมดอัตโนมัติ

ข้อจำกัดเดิมเรื่อง Windows ARM64, screen reader จริง, SMTP, iframe Maps และ LinkedIn ยังเป็นไปตามผลตรวจรุ่นก่อนด้านล่าง ไม่มีการ deploy โดเมนสาธารณะหรือ push Docker image ไป registry

---

# ผลการตรวจ v1.6.0 — 17 พฤศจิกายน 2026

ดำเนินการตามรายการที่ผู้ใช้รวบรวมในแชทและอนุญาตด้วย “แก้ไขได้” รายการเทียบคำขออยู่ใน [REVISION-02.md](REVISION-02.md) ทดสอบด้วยฐานข้อมูล บัญชี และไฟล์ชั่วคราว ไม่แก้ข้อมูลใช้งานจริงใน `.data`

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1 |
| API 32 ชุด | ผ่านทั้งหมด รวม format enums/ป้องกัน CSS ที่ไม่อนุญาต, migration 3, ไอคอนประจำการ์ด, editorLabels, footerNav, partial client เก่า, restart และ backup/restore พร้อมภาพ |
| Admin UX 61 กรณี | ผ่าน login, CRUD, ฟอร์มและอัปโหลด, การบันทึกขณะมีการพิมพ์เพิ่ม, responsive 1440/768/390/320px, keyboard/focus และ axe WCAG A/AA |
| หน้าบ้าน 53 กรณี | ผ่าน TH/EN ทั้ง 5 หน้า responsive, ฟอร์มจริง, computed typography, icon/upload และ automated accessibility |
| รายการแก้ไข 01 จำนวน 40 กรณี | ผ่าน รวมภาพข่าว ย่อหน้าพร้อมรูป/อัตราส่วน อัปโหลดหลายภาพ โหมดปิดปรับปรุง และไฟล์หลัง restart |
| รายการแก้ไข 02 จำนวน 36 กรณี | ผ่านชื่อส่วน/คำอธิบาย/ชื่อช่อง/ชื่อการ์ดที่แก้ได้, ไอคอนภายในการ์ดและการจัดลำดับ, รูปแบบข้อความ/การจัดแนว 5 แบบ, ตัวอักษรตามจอ, บทความ 3 ส่วน และ Header/Footer แยกหน้า |
| รูปแบบข้อความจริง | ตรวจ computed font-size จากสไตล์กลางที่ 1440/768/390px; กระจายข้อความใช้ text-align-last:justify ต่างจากชิดขอบทั้งสองด้าน; ค่าและเนื้อหา TH/EN อยู่หลัง restart |
| Header/Footer | ตรวจเมนูส่วนท้ายแยกจากส่วนหัว โลโก้ที่อัปโหลด หัวข้อ Footer สีขาวพื้นใส และแบรนด์ยาวที่เลือกสไตล์ใหญ่ใน TH/EN ที่ 320px ไม่ล้น เมนูมือถือเปิดใต้ Header จริง |
| Accessibility | ชุดใหม่ไม่พบ axe WCAG A/AA violation หรือ JS errors หลังแก้ contrast สีแบรนด์บนพื้นขาวและข้อความยาวใน Footer |
| ตัวอย่างภาพ | ตรวจภาพหน้าจอจริงของหน้าแรก การ์ด บทความ Header/Footer และ Footer สาธารณะ อยู่ใน docs/screenshots ไม่มีข้อมูลรหัสผ่าน |
| บัญชีพรีวิว | setup/recovery และใช้บัญชีจาก initial-admin → /admin → logout → restart → login ผ่านใน Chromium |
| Docker / Compose | build v1.6.0 ผ่าน, HTTP/API/non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน; Compose config ผ่าน |

Windows Server 2022 x64 / PowerShell 5.1 ผ่าน [Windows preview run #16](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/44001744972) — implementation commit `58a9e04baf62592d4b3bc27f6a8d67e78d1eb2b3`, workflow Success (3 นาที 51 วินาที), job succeeded (3 นาที 48 วินาที):

- แตก source ZIP ในโฟลเดอร์ที่มีช่องว่างและภาษาไทย ตรวจ START-WINDOWS กับ Internet Zone รวมการปฏิเสธสคริปต์ที่ถูกแก้ การตรวจ hash และปลดบล็อกเฉพาะไฟล์ที่กำหนด
- ตรวจ portable Node, initial-admin login/restart, WinForms/GUI/VBS โดยไม่เปลี่ยน Execution Policy ถาวร
- API 32 ชุด และ Edge browser สำหรับ setup/recovery, initial-admin, Admin UX 61 กรณี รายการแก้ไข 01 จำนวน 40 กรณี และรายการแก้ไข 02 จำนวน 36 กรณีผ่านตามขั้นตอนที่กำหนดใน workflow

CI ใช้ Edge headless และจำลอง Mark-of-the-Web บนไฟล์ที่แตกแล้ว ยืนยันสถานะสำเร็จจากหน้า workflow/job สาธารณะ ไม่ได้อ่าน log ที่ต้องเข้าสู่ระบบ ไม่เท่ากับการดาวน์โหลด/แตก ZIP ด้วย Explorer หรือทดสอบ screen reader บนเครื่องผู้ใช้จริง

ข้อจำกัด: automated accessibility ไม่เท่ากับการทดสอบ NVDA/VoiceOver จริง ยังไม่ได้ตรวจ Safari/Firefox, Windows ARM64 หรือเครื่องผู้ใช้ทุก build ภาพต้นแบบเป็นภาพส่งออกจึงมีข้อจำกัดความคมชัดของโลโก้เดิม SMTP จริง พิกัด iframe Maps และ URL LinkedIn ยังรอข้อมูล/ทดสอบภายนอกตามเดิม ไม่มีการ deploy สู่โดเมนสาธารณะหรือ push Docker image ไป registry

---

# ผลการตรวจ v1.5.0 — 16 พฤศจิกายน 2026

แก้ตามรายการและภาพประกอบใน DOCX ทั้งสองไฟล์ รายละเอียดเทียบแต่ละข้ออยู่ใน [REVISION-01.md](REVISION-01.md) ใช้ฐานข้อมูลชั่วคราวและรหัสผ่านสุ่มสำหรับการทดสอบทั้งหมด ไม่แก้ข้อมูลผู้ใช้ใน `.data`

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1 |
| API 27 ชุด | ผ่านทั้งหมด รวม auth/CSRF/revision, validation, migration 2, restart, backup/restore พร้อมรูป และ structured article blocks |
| Admin UX 61 กรณี | ผ่านการแก้ข้อความ รูป และไอคอนจากหน้าเว็บ การบันทึกแบบร่าง CRUD ข่าว responsive 1440/768/390/320px, keyboard/focus และ axe WCAG A/AA |
| หน้าบ้าน 53 กรณี | ผ่าน TH/EN ทั้ง 5 หน้า 1440/768/390px, ฟอร์มจริง, direct upload, ไอคอน, computed typography ข้ามหน้า และ automated accessibility |
| รายการแก้ไข 01 เพิ่มอีก 40 กรณี | ผ่านอัตราส่วนภาพข่าวและภาพข่าวเด่นเต็มกรอบ สี/พื้นหลังไอคอนจริงจาก CMS, ฟอร์มเรียงต่อเนื่อง, ย่อหน้า TH/EN พร้อมภาพและตำแหน่ง/อัตราส่วน, อัปโหลดแกลเลอรีหลายภาพ |
| Maintenance | ผ่านทุกหน้าสาธารณะที่ตรวจ TH/EN รวมแท็บผู้เข้าชมที่เปิดอยู่ก่อนปิดเว็บ (poll 3 วินาที), API สาธารณะ 503, เก็บเนื้อหาออกจาก public content response, admin login ขณะปิด, restart และเปิดเว็บกลับ |
| รักษาข้อมูล | migration ทำซ้ำได้และรักษาไอคอนที่ผู้ใช้ปรับไว้; client เก่าที่ไม่ส่ง blocks ไม่ล้างย่อหน้าใหม่; backup/restore รักษารูปกับเนื้อหาใหม่ |
| บัญชีพรีวิว | browser setup/recovery และบัญชีจาก initial-admin → /admin → logout → restart → login ผ่าน |
| Docker / Compose | build v1.5.0, HTTP/API, non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน; Compose config ผ่าน |
| ตัวเปิด Windows | generator --check และ Windows CI ของชุดส่งมอบผ่าน รายละเอียดด้านล่าง |
| ตรวจภาพจริง | ตรวจ dashboard, editor, paragraph/image controls, public news/contact และ maintenance; ภาพตัวอย่างใน docs/screenshots ไม่มีรหัสผ่าน |

Windows Server 2022 x64 / PowerShell 5.1 ผ่าน [Windows preview run #15](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/43800619302) — implementation commit `8138184`, workflow Success (2 นาที 25 วินาที), job succeeded (2 นาที 21 วินาที):

- แตก source ZIP ในโฟลเดอร์ที่มีช่องว่างและภาษาไทย ตรวจ START-WINDOWS กับ Internet Zone รวมการปฏิเสธสคริปต์ที่ถูกแก้ ตรวจ hash และปลดบล็อกเฉพาะไฟล์ที่กำหนด
- ตรวจ portable Node, initial-admin login/restart, WinForms/GUI/VBS โดยไม่เปลี่ยน Execution Policy ถาวร
- API ทั้ง 27 ชุด และ Edge browser สำหรับ setup/recovery, initial-admin, Admin UX 61 กรณี และรายการแก้ไข 01 อีก 40 กรณีผ่านตามขั้นตอนที่กำหนดใน workflow

CI ใช้ Edge headless และจำลอง Mark-of-the-Web บนไฟล์ที่แตกแล้ว ยืนยันสถานะสำเร็จจากหน้า workflow/job สาธารณะ ไม่ได้อ่าน log ที่ต้องเข้าสู่ระบบ ไม่เท่ากับการดาวน์โหลดและแตก ZIP ด้วย Explorer หรือการทดสอบ screen reader บนเครื่องผู้ใช้จริง

ข้อจำกัดต้นฉบับ: ข่าวเดิม 3 เรื่องมีเพียงคำโปรยในไฟล์ที่ได้รับ จึงแสดงข้อความที่บันทึกจริงครั้งเดียวและมีเครื่องมือเพิ่มเนื้อหาฉบับเต็ม ไม่แต่งรายละเอียดกิจกรรมบริษัทที่ไม่มีต้นทาง บรรทัดท้ายเอกสารหลังบ้าน “แก้ไขให้รายจัด” ไม่สมบูรณ์จึงยังระบุการแก้ไขเพิ่มเติมจากบรรทัดนี้ไม่ได้

ข้อจำกัดการตรวจ: automated accessibility ไม่ใช่การทดสอบ NVDA/VoiceOver จริง ยังไม่ได้ตรวจ Safari/Firefox, Windows ARM64 หรือเครื่องผู้ใช้ทุก build SMTP จริง, พิกัด iframe Maps และ URL LinkedIn ยังรอข้อมูล/ทดสอบภายนอกตามเดิม ไม่ได้ deploy สู่โดเมนสาธารณะหรือ push Docker image ไป registry

---

# ผลการตรวจ v1.4.0 — 13 พฤศจิกายน 2026

ศึกษาหน้าล็อกอิน โครงเมนู ฟอร์ม ตาราง และ typography จาก source ของ `tree-rose-main.zip` ที่ผู้ใช้แนบ แล้วปรับให้ใกล้เคียงโดยใช้แบรนด์ BSIGN TECH ทดสอบด้วยฐานข้อมูลและบัญชีชั่วคราว ไม่ใช้ฐานข้อมูล รหัสผ่าน หรือ assets แบรนด์ของโปรเจกต์ตัวอย่าง เอกสารในไฟล์แนบใช้เป็นข้อมูลอ้างอิง ไม่ใช่คำสั่งแทนคำขอผู้ใช้

| รายการ | ผล |
|---|---|
| Production build | ผ่าน Node.js 24.22.1; Prompt/Inter ให้บริการจากแอป ไม่มี Google Fonts request |
| API 23 ชุด | ผ่าน รวม auth/CSRF, validation, partial patch/revision, migration, restart, backup/restore และ overview พร้อมภาพปกที่ไม่เปิดเผยข้อมูลภายใน |
| Admin UX 61 กรณีใน Chromium | ผ่าน login/dashboard, ค้นหาเมนู, แท็บหน้าเว็บ/สไตล์, CRUD/ค้นหา/กรอง/แบ่งหน้าข่าว, upload/sanitize, รูป/ไอคอน/typography และการบันทึกจริง |
| ภาษาและแบบร่าง | สลับ TH/EN แล้วยังรักษาข้อมูลทั้งสองภาษา; จำลอง PATCH ที่ตอบช้าแล้วพิมพ์เพิ่ม ข้อความใหม่ไม่ถูกผลตอบกลับล้าง และบันทึกรอบถัดไปได้ |
| Responsive / keyboard | ตรวจ 1440/768/390/320px ไม่พบ document แนวนอนล้น; drawer focus trap, Tab/Shift+Tab, Escape และคืน focus ผ่าน |
| Accessibility | axe WCAG A/AA ไม่พบ violation ในหน้าที่ตรวจ รวม login/dashboard/editor/articles/media และหน้ามือถือ |
| หน้าบ้าน 53 กรณี | TH/EN ทั้ง 5 หน้า รูป/overflow, public axe, ฟอร์มจริง, CMS edit/upload/icons, computed styles ข้ามหน้าและ keyboard ผ่าน |
| เปิดพรีวิวและบัญชี | browser สร้างบัญชีเอง/กู้บัญชี และใช้ Username/Password จาก initial-admin → /admin → logout → restart → login ผ่าน |
| Docker / Compose | build image v1.4.0 ผ่าน, HTTP/API, non-root และข้อมูลอยู่หลังเปลี่ยน container ผ่าน; Compose config ผ่าน |
| ตัวเปิด Windows | hash generator --check และ Windows CI ของรุ่นนี้ผ่าน รายละเอียดด้านล่าง |
| การตรวจภาพ | ตรวจ login/dashboard/editor/mobile จากระบบจริง; ภาพสะอาดใน docs/screenshots ไม่มีรหัสผ่านในภาพ |

Windows Server 2022 x64 / PowerShell 5.1 ผ่าน [Windows preview run #14](https://github.com/chanakan20010-cpu/BSIGN-WEB/actions/runs/43440206336) — implementation commit `f070bd51ec8e66b200d89b13c1253022af39482f` สถานะ workflow และ job เป็น Success (2 นาที 34 วินาที):

- แตก source ZIP ลงโฟลเดอร์ที่มีช่องว่างและภาษาไทย ตรวจ START-WINDOWS กับ NTFS Zone.Identifier เพื่อจำลองไฟล์ดาวน์โหลด รวมการปฏิเสธไฟล์ที่ถูกแก้และปลดบล็อกเฉพาะสคริปต์ที่ตรวจ hash แล้ว
- ตรวจ CMD/portable Node, initial-admin login/restart, WinForms และ GUI/VBS โดยไม่เปลี่ยน Execution Policy ถาวร
- API 23 ชุด และ Edge browser สำหรับ setup/recovery, initial-admin และ Admin UX 61 กรณีผ่านตามขั้นตอนที่กำหนดใน workflow

CI ใช้ Edge headless; ยืนยันสถานะสำเร็จจากหน้า workflow/job สาธารณะ ไม่ได้อ่าน log รายขั้นที่ต้องเข้าสู่ระบบ การจำลอง Mark-of-the-Web บนไฟล์ที่แตกแล้วไม่ใช่การดาวน์โหลดผ่านเบราว์เซอร์และแตก ZIP ด้วย Explorer บนเครื่องผู้ใช้จริง

ข้อจำกัด: axe และ keyboard ไม่เท่ากับทดสอบ screen reader จริง เช่น NVDA/VoiceOver; ยังไม่ได้ตรวจ Safari/Firefox, Windows ARM64 หรือเครื่องผู้ใช้จริงทุก build หน้า System มีสถานะและคู่มือสำรองข้อมูลตามระบบเดิม ไม่ได้เพิ่มปุ่ม backup/restore บนเว็บ SMTP จริง, iframe Maps และ URL LinkedIn ยังต้องเติมข้อมูล/ทดสอบตามขอบเขตเดิมด้านล่าง ไม่มีการ deploy โดเมนสาธารณะหรือ push Docker image ไป registry ในรอบนี้

---

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
