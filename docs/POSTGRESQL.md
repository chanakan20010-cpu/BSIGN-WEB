# แนวทางย้ายไป PostgreSQL

SQLite เหมาะกับการติดตั้ง instance เดียว ไฟล์อยู่บน local persistent volume ห้ามแชร์ SQLite ผ่าน network filesystem ระหว่างหลาย replicas

1. หยุดการเขียนและสร้าง backup พร้อม uploads ตรวจ manifest และทดลอง restore ก่อนเปลี่ยนระบบ
2. ย้าย connection/query ใน server/db.js และ repository calls ใน server/app.js ไปใช้ pg และ async transactions (SQLite placeholder `?` เปลี่ยนเป็น `$1` เป็นต้น)
3. ใช้ JSONB สำหรับ documents.value / articles.value / contacts.value, bigint revision และ timestamptz สำหรับวันเวลา เพิ่ม unique index ของ slug, user email และ subscriber email; ใช้ตาราง sessions ใน PostgreSQL
4. ใช้ `UPDATE ... WHERE revision = $n RETURNING` ต่อไปเพื่อป้องกัน lost updates; migration ทุกครั้งต้องมีเลขเวอร์ชันและ transaction
5. นำเข้าข้อมูลโดยคง id และ revision เดิม ย้าย uploads ไป persistent storage ร่วมที่กำหนดสิทธิ์ไว้ ห้ามเปลี่ยน URL โดยไม่มี migration
6. เปรียบเทียบจำนวน records, checksums ของ media และรันชุด API/browser/backup ใหม่ทั้งหมดก่อนสลับ traffic
7. ใช้ pg_dump + snapshot uploads ที่อยู่ใน maintenance window เดียวกัน ทดสอบ pg_restore ในฐานข้อมูลชั่วคราว

ยังไม่ได้ติดตั้ง PostgreSQL หรือทดสอบการย้ายจริงใน v1.0.0 เอกสารนี้เป็นแนวทาง ไม่ใช่ตัวสลับฐานข้อมูลอัตโนมัติ
