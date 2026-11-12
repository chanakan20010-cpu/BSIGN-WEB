# BSIGN TECH — v1.1.0

เว็บไซต์ TH/EN ตามภาพส่งออก Figma ที่ผู้ใช้แนบ: หน้าแรก เกี่ยวกับเรา ข่าวสาร รายละเอียดข่าว และติดต่อเรา พร้อม CMS, REST API และ SQLite จริง

## เปิดพรีวิวบน Windows — ไม่ต้องพิมพ์คำสั่ง

1. ดาวน์โหลด ZIP เวอร์ชันล่าสุด แล้ว **แตกไฟล์ทั้งโฟลเดอร์**
2. ดับเบิลคลิก **OPEN-PREVIEW.vbs** หรือ **START-WINDOWS.cmd**
3. รอหน้าต่างเตรียมระบบครั้งแรก เว็บไซต์จะเปิดในเบราว์เซอร์อัตโนมัติ
4. กด **สร้างบัญชีแอดมิน** ในหน้าต่างพรีวิว แล้วตั้งอีเมล/รหัสผ่านผ่านหน้าเว็บ เมื่อมีบัญชีแล้วปุ่มนี้จะเปิดหลังบ้าน
5. กด **หยุดพรีวิวและปิด** เมื่อเสร็จ ข้อมูลยังคงอยู่เมื่อเปิดครั้งถัดไป

ไม่ต้องติดตั้ง Node.js เอง และไม่ต้องมีสิทธิ์ Administrator ตัวเปิดใช้ Node.js 24 แบบ portable ใน `.runtime` ของโปรเจกต์ ตรวจ SHA-256 จากรายการที่ตรึงไว้ของ nodejs.org ก่อนใช้ และไม่แก้ Node.js หรือ PATH ถาวรของเครื่อง ใช้อินเทอร์เน็ตเฉพาะเตรียมครั้งแรก/อัปเดต dependencies; เปิดครั้งถัดไปใช้ cache หากโค้ดไม่เปลี่ยน

รองรับ Windows 10/11 แบบ x64 และมีตัวเลือกดาวน์โหลด ARM64 ตามสถาปัตยกรรมเครื่อง (ผลทดสอบจริงแยกไว้ใน docs/VALIDATION.md) พรีวิวเลือกพอร์ตว่างอัตโนมัติและรับเฉพาะเครื่องนี้ ปิดหน้าต่างเบราว์เซอร์อย่างเดียวจะยังไม่หยุดเซิร์ฟเวอร์ ให้ปิดหน้าต่างตัวเปิดด้วย

หาก Windows บล็อกไฟล์ที่ดาวน์โหลด ให้คลิกขวา ZIP → Properties → Unblock (ถ้ามี) → Apply แล้วแตกใหม่ ตัวเปิดใช้ RemoteSigned เฉพาะ process ไม่เปลี่ยน execution policy ของระบบ และไม่หลบ Group Policy เครื่ององค์กรที่ห้าม VBScript/PowerShell ต้องให้ฝ่ายไอทีอนุญาตก่อน มีคู่มือแบบเปิดอ่านได้ที่ `START-HERE.html`

หากมีปัญหา กด **เปิดบันทึกการเตรียมระบบ** ในหน้าต่าง บัญชีผู้ดูแลเดิมและ `.data` / `.env` ไม่ถูกเขียนทับ หน้า setup สร้างบัญชีแรกได้เฉพาะลิงก์ที่ตัวเปิดสร้างและเมื่อยังไม่มีบัญชีเท่านั้น เมื่อมีบัญชีแล้วจะกลับไปใช้ login ปกติ

### Username และ Password ของแอดมิน

**ไม่มีบัญชีหรือรหัสผ่านสำเร็จรูป** ชื่อเข้าสู่ระบบคือ **อีเมลที่คุณตั้งเอง** ตอนสร้างบัญชี รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษรและไม่แสดงใน log

- ยังไม่มีบัญชี: กด **สร้างบัญชีแอดมิน** ตั้งอีเมลและรหัสผ่าน แล้วระบบเปิด CMS ให้อัตโนมัติ
- มีบัญชีแล้ว: กด **เข้าสู่หลังบ้าน** (หรือปุ่มแอดมินเดิมที่ยังอยู่ในหน้าต่าง) แล้วใช้อีเมล/รหัสผ่านที่ตั้งไว้
- ลืมอีเมลหรือรหัสผ่าน: กด **บัญชีแอดมิน / ลืมรหัสผ่าน** ในหน้าต่างตัวเปิด เลือกอีเมลที่มีอยู่ ตั้งรหัสผ่านใหม่ แล้วเข้าสู่ระบบ ทุก session จะออกจากระบบ แต่ข้อมูลเว็บและรูปภาพอยู่ครบ

การดูบัญชีและตั้งรหัสผ่านใหม่ใช้ลิงก์เฉพาะที่ตัวเปิดบนเครื่องนี้สร้างให้ ไม่เปิดความสามารถนี้ใน `npm start` หรือ Docker บนเซิร์ฟเวอร์สาธารณะ ผู้ที่มีสิทธิ์เข้าถึงไฟล์โปรเจกต์ในเครื่องจึงควรเป็นผู้ดูแลที่เชื่อถือได้

### อัปเดตจาก ZIP เวอร์ชันเก่าโดยไม่พิมพ์คำสั่ง

1. หยุดพรีวิวเก่าด้วยปุ่ม **หยุดพรีวิวและปิด**
2. เก็บสำเนาโฟลเดอร์เก่าทั้งโฟลเดอร์ไว้เป็น backup แล้วแตก ZIP ใหม่ในอีกโฟลเดอร์
3. คัดลอก **.data** และ **.env** จากเวอร์ชันเก่าไปยังโฟลเดอร์ใหม่ หากตั้ง `DATA_DIR` เอง ให้เก็บ/คัดลอกโฟลเดอร์นั้นตามค่าที่ใช้ด้วย
4. เปิด **OPEN-PREVIEW.vbs** จากโฟลเดอร์ใหม่ บัญชี เนื้อหา และรูปเดิมยังอยู่ ไม่ต้องคัดลอก node_modules หรือ .runtime

ห้ามเปิดพรีวิวสองเวอร์ชันพร้อมกันโดยใช้ฐานข้อมูลเดียวกัน

## สำหรับนักพัฒนา / เซิร์ฟเวอร์

ติดตั้ง Node.js 24 LTS แล้วรันในโฟลเดอร์โปรเจกต์:

```sh
npm ci
cp .env.example .env
npm run build
npm run admin:create
npm start
```

โหมดเซิร์ฟเวอร์ใช้ `http://localhost:3000` และ CMS ที่ `/admin` โดย origin ต้องตรง `APP_ORIGIN` ส่วนตัวเปิดพรีวิวจัดการ origin/port ให้เองโดยไม่แก้ `.env`

`npm run dev` ใช้ Vite hot reload และ API ใน origin เดียวกัน แม้มี dist อยู่แล้ว ส่วน `npm start` เสิร์ฟ production build โหมด dev อนุญาต Vite inline preamble/WebSocket ใน CSP เฉพาะระหว่างพัฒนา โหมด production ใช้ CSP ที่เข้มงวดกว่า

## การใช้งาน CMS

- แบ่งหมวดตามหน้า พร้อมส่วนกลาง เมนู บริษัท แบนเนอร์ สไตล์ตัวอักษร ไอคอน คลังไฟล์ และบทความ
- ช่อง `ไทย` / `English` แก้แต่ละภาษา สีข้างข้อความหัวข้อใช้แยกบรรทัดได้ ฟอนต์และขนาดใช้สไตล์กลางร่วมกัน
- สไตล์กลางมี font, size Desktop/Tablet/Mobile, color, weight, spacing (px), line height (ตัวคูณ) พร้อมตัวอย่างก่อนบันทึกและคืนค่าเริ่มต้น
- ปุ่มคืนค่าเริ่มต้นยังไม่บันทึกทันที ต้องกดบันทึกหลังตรวจตัวอย่าง
- คลังภาพรับ SVG/PNG/JPEG/WebP สูงสุด 8 MB และ 20 ล้านพิกเซล บันทึกที่มาและสิทธิ์ภาพ ฝั่ง server decode raster เป็น WebP และลบ metadata; SVG sanitize และปิด scripts/external references ก่อนเก็บ
- เลือกภาพจากคลังในช่องรูป หรือนำ URL จากคลังไปใส่ favicon; การเปลี่ยนภาพจะเลิกใช้บริเวณภาพที่อ้างอิงจาก screenshot
- ไอคอนแก้แบบใช้ร่วมกัน หรือ override เฉพาะตำแหน่งได้ SVG แบบ mask เปลี่ยนสีเดียวได้ ภาพ raster เปลี่ยนเฉพาะพื้นหลัง คืนค่าเฉพาะจุดให้กลับไปใช้ shared ได้
- บทความสร้าง/แก้/ลบ จัดหมวด draft/published และวันเผยแพร่ UTC; ข่าว published ที่อยู่ในอนาคตจะยังไม่แสดง ไม่สามารถลบหมวดที่มีบทความใช้อยู่
- การค้นหาข่าว ตัวกรอง และ pagination อ่านฐานข้อมูลจริง ไม่เพิ่มข่าวซ้ำเพื่อให้เต็มจำนวนการ์ดใน mockup
- ข้อความติดต่อมีสถานะ new/read/resolved และลบข้อมูลได้ สถานะส่งอีเมลแยกจากการรับข้อความ
- เปลี่ยนรหัสผ่านจะยกเลิกทุก session และให้เข้าสู่ระบบใหม่
- การบันทึกใช้ revision ตรวจการแก้พร้อมกัน หากเจอ conflict ให้คัดลอกงานในช่องไว้ แล้วโหลดข้อมูลใหม่ก่อนรวมการแก้ไข ห้ามบังคับเขียนทับ ข้อมูลที่ request ไม่ได้ส่งมายังคงอยู่

## ข้อมูลถาวรและการอัปเดต

`DATA_DIR` (ค่าเริ่มต้น `.data`) เก็บ `site.sqlite`, WAL, uploads และ session.key เซิร์ฟเวอร์สร้างฐานข้อมูลและ migration แบบ idempotent และ seed เฉพาะข้อมูลเริ่มต้น ไม่เขียนทับเนื้อหาที่แก้แล้ว

ก่อนอัปเดตให้หยุดเซิร์ฟเวอร์และ backup จากนั้น `git pull --ff-only`, `npm ci`, `npm run build`, `npm start` โดยคง `.data`, `.env` และ backups ไว้เสมอ ห้ามใช้ `git clean -fdx` หรือ `docker compose down -v` กับข้อมูลใช้งานจริง

### Backup / restore

หยุดเซิร์ฟเวอร์เพื่อให้ฐานข้อมูลกับ uploads อยู่ในจังหวะเดียวกัน:

```sh
BSIGN_MAINTENANCE=1 npm run backup -- backups/backup-001
npm run restore -- backups/backup-001 .data-restored
```

Windows CMD: ใช้ `set BSIGN_MAINTENANCE=1` ก่อน `npm run backup -- backups\backup-001`

Backup ใช้ SQLite backup API พร้อมสำเนา uploads และ SHA-256 manifest; restore ตรวจ checksum และ integrity ก่อนคัดลอก และยอมรับเฉพาะปลายทางใหม่เพื่อไม่ล้างข้อมูลเดิม หลังตรวจข้อมูลให้กำหนด `DATA_DIR=.data-restored` ใน `.env` แล้วเริ่มเซิร์ฟเวอร์ Session ถูกยกเลิกเมื่อ restore; ไม่คัดลอก `.env` หรือ session secret ลง backup ให้เก็บ configuration/secret อย่างปลอดภัยแยกต่างหาก ตัว backup มีข้อมูลส่วนบุคคล จัดเก็บในที่จำกัดสิทธิ์

## Docker

```sh
# เตรียม .env จาก .env.example ก่อน
# localhost HTTP สำหรับทดสอบในเครื่อง
 docker compose up --build -d
 docker compose exec web npm run admin:create
 docker compose logs --tail=30 web
```

ข้อมูลอยู่ named volume `bsign_data` แยกจาก image; `.env` ไม่ถูก COPY เข้า image รันด้วยผู้ใช้ node ที่ไม่ใช่ root

Production ต้องตั้ง `NODE_ENV=production`, `APP_ORIGIN=https://โดเมนจริง`, `COOKIE_SECURE=true` และใช้ TLS reverse proxy ด้านหน้า หากอยู่หลัง proxy หนึ่งชั้นให้ตั้ง `TRUST_PROXY=1` พร้อมจำกัดการเข้าถึง port 3000 ให้มาจาก proxy เท่านั้น ไม่ตั้ง trust proxy แบบเปิดโดยไม่ตรวจ topology

Docker build ใน Codex cloud ต้องส่ง CA ให้ npm โดยรักษา TLS verification:

```sh
docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t bsign-web:1.1.0 .
docker compose up --no-build -d
```

Backup volume ด้วยการหยุด web แล้วใช้ `docker compose run --rm -e BSIGN_MAINTENANCE=1 -v "$PWD/backups:/backups" web npm run backup -- /backups/backup-001` ต้องให้ user node เขียนโฟลเดอร์ backups ได้ ทดสอบ restore ไป volume ใหม่ก่อนเปลี่ยน production volume ห้ามลบ volume เดิม

## บริการภายนอกและสิ่งที่ต้องเติม

- ใช้ `visit@bsign.work` ทุกตำแหน่งตามคำยืนยันของผู้ใช้
- ลิงก์หมุดที่ยืนยัน: https://maps.app.goo.gl/MqMtHhTiYdafpjLC7 ใช้ปุ่มนำทางเดียวกันทั้ง TH/EN แต่เครือข่ายคลาวด์ยังไม่ยอมให้เปิดลิงก์เพื่ออ่านพิกัด จึงไม่แสดงแผนที่ตัวอย่างผิดประเทศ เมื่อได้ latitude/longitude ให้ใส่ใน CMS และเลือกยืนยันพิกัด ทั้ง iframe และ navigation จะใช้พิกัดคู่เดียวกัน
- SMTP เป็นส่วนเสริม ใส่ SMTP_HOST/PORT/SECURE/USER/PASSWORD และ MAIL_FROM/MAIL_TO ใน `.env` หรือ secret ของผู้ให้บริการ ไม่ส่งรหัสผ่านในแชต รับฟอร์มลงฐานข้อมูลทำงานได้แม้ SMTP ไม่พร้อม API คืน `saved` และ `mailStatus` แยกกัน หลังตั้งค่าต้องทดสอบการส่งและการได้รับอีเมลจริง ยังไม่ได้ทดสอบส่งจริงในเวอร์ชันนี้
- LINE/Facebook ใช้ handle จากต้นแบบ URL ภายนอกยังไม่ได้ตรวจการเข้าถึง LinkedIn มีชื่อแต่ไม่มี URL ในต้นแบบ จึงแสดงข้อมูลและรอ URL ใน CMS
- ต้นแบบไม่มีแบบฟอร์ม newsletter จึงไม่เพิ่มองค์ประกอบนอกดีไซน์ มี API `/api/subscribe` และหลังบ้านจัดการรายชื่อ แต่ไม่มีการส่งแคมเปญ
- หน้านโยบายความเป็นส่วนตัวมีข้อความเริ่มต้นที่แก้ไขได้ ควรใส่รายละเอียดผู้ควบคุมข้อมูล ระยะเก็บรักษา และขั้นตอนตามนโยบายบริษัทก่อนเปิดรับข้อมูลสาธารณะ

## ดีไซน์และข้อสมมติ

ใช้ layout สี ลำดับส่วน และภาพจากไฟล์แนบ ไม่สร้างรูปใหม่ หน้า Mobile/Tablet อนุมานจาก Desktop โดยยุบการ์ดและคอลัมน์ มีเมนูมือถือ ใช้ Noto Sans Thai / Noto Sans เพราะไฟล์ส่งออกไม่ระบุชื่อฟอนต์ รายละเอียดต้นทางอยู่ใน `docs/ASSETS.md`

รูปต้นฉบับแยกชิ้นไม่ได้แนบมา จึงแสดงบริเวณภาพจาก JPEG ของหน้าเว็บด้วยกรอบ viewBox มีข้อจำกัดด้านความคมชัด โดยเฉพาะโลโก้ ภาษาอังกฤษแปลจากต้นแบบภาษาไทย บทความเปิดตัวมีเนื้อหาเต็มจาก Markdown ส่วนอีกสามบทความมีเฉพาะคำโปรยในต้นแบบ จึงใช้คำโปรยเป็นเนื้อหาเริ่มต้นที่ผู้ดูแลสามารถเติมต่อได้ ไม่มีเนื้อหาข่าวแต่งขึ้นเพิ่มเติม

## ทดสอบ

```sh
npm test
npm run build
npm run test:browser
npm run test:preview
```

Browser tests ใช้ Chromium (`CHROMIUM_PATH` เปลี่ยนตำแหน่ง binary ได้) ใช้ฐานข้อมูลและบัญชีสุ่มชั่วคราว ไม่เขียนข้อมูลทดสอบลง `.data` สร้าง screenshots ใน test-results ซึ่งไม่ commit

ดูผลที่ตรวจจริงและข้อจำกัดใน `docs/VALIDATION.md` และแนวทาง PostgreSQL ใน `docs/POSTGRESQL.md` ยังไม่มีการติดตั้ง PostgreSQL อัตโนมัติ

## API โดยย่อ

อ่านสาธารณะ: GET `/api/health`, `/api/content`, `/api/articles?lang=th&q=&category=&page=1`, `/api/articles/:slug`

เริ่ม session: GET `/api/session` คืน CSRF token ทุก mutation ต้องส่ง Origin ตรง APP_ORIGIN และ X-CSRF-Token ของ cookie session

POST `/api/login`, `/api/logout`, `/api/password`, `/api/contact`, `/api/subscribe`

ผู้ดูแล: GET `/api/admin/documents`, PATCH `/api/admin/documents/:key` ส่ง `{revision,patch}`; CRUD `/api/admin/articles`; GET/POST multipart `/api/admin/media`; GET/PATCH/DELETE `/api/admin/contacts`; GET/DELETE `/api/admin/subscribers`

API ส่ง error code แทนข้อมูลภายในและไม่แสดง stack/รหัสผ่านให้ client; HTML ไม่รับ raw content จาก CMS ใช้ text rendering เพื่อป้องกัน XSS
