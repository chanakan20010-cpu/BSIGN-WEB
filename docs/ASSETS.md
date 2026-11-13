# ที่มาของ assets

- ภาพและโลโก้: ไฟล์ ZIP ที่ผู้ใช้แนบ `Website - BSIGN TECH (Page 1) Export (MD) 10-Nov-2026-11.27am.zip` มีภาพ JPEG ของหน้าเว็บ ไม่ได้มีภาพต้นฉบับแยกชิ้น ใช้ไฟล์อ้างอิงใน `public/reference` และกำหนดบริเวณภาพด้วย viewBox ของ `Picture` ไม่ได้แสดงทั้งหน้าเป็น mockup ข้อความและฟอร์มทั้งหมดเป็น HTML จริง ความละเอียดขึ้นกับภาพส่งออก ผู้ใช้ควรแทนด้วยไฟล์ต้นฉบับผ่าน CMS เมื่อต้องการคุณภาพสูงขึ้น
- รูปภาพมีสิทธิ์ตามที่เจ้าของไฟล์ต้นแบบได้รับมา ไม่ถือว่าเป็นภาพสาธารณะหรือได้รับอนุญาตให้แจกเป็น stock asset
- ฟอนต์ Noto Sans Thai / Noto Sans: Google Noto, SIL Open Font License 1.1 ผ่าน `@fontsource` จัดเก็บและให้บริการจากแอป ไม่มี Google Fonts request; ไม่พบชื่อฟอนต์ในไฟล์แนบ จึงใช้เป็นข้อสมมติที่เปลี่ยนใน CMS ได้
- ไอคอนทั่วไป: Lucide, ISC License https://lucide.dev/license
- Facebook / LINE / LinkedIn: Font Awesome Free Brands, CC BY 4.0 สำหรับไอคอน https://fontawesome.com/license/free และ https://github.com/FortAwesome/Font-Awesome; เครื่องหมายการค้ายังคงเป็นของเจ้าของแบรนด์ การใช้ไอคอนไม่แสดงถึงการรับรองจากแบรนด์
- ไอคอนโซเชียลสร้างจาก path ที่แพ็กเกจให้มา ไม่ใช้ SVG ดิบจากผู้ใช้
- รูปอัปโหลดบันทึก source/license ในตาราง media; SVG ถูก sanitize ฝั่ง server ก่อนเก็บ ใช้ `<img>` หรือ CSS mask ไม่แทรก markup ที่อัปโหลดลง DOM
- ภาพ raster เปลี่ยนสีภายในไม่ได้; ใช้สีต้นฉบับและเปลี่ยนเฉพาะพื้นหลังได้
- ไอคอนภายใน Google Maps, browser UI, native form validation และเครื่องมือช่วยการเข้าถึงของระบบปฏิบัติการอยู่นอก CMS

## ฟอนต์ระบบหลังบ้าน v1.4.0

ใช้ Prompt และ Inter แบบ bundled ผ่าน @fontsource ตามรูปแบบของโปรเจกต์ตัวอย่าง ใบอนุญาต SIL Open Font License อยู่ใน `public/licenses/prompt-OFL.txt` และ `public/licenses/inter-OFL.txt` แหล่งแพ็กเกจ: https://fontsource.org/fonts/prompt และ https://fontsource.org/fonts/inter สไตล์ข้อความของหน้าสาธารณะยังใช้การตั้งค่าส่วนกลางเดิม
