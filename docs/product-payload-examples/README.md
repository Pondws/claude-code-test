# ตัวอย่าง payload สินค้า

ID ในไฟล์ใช้ชื่ออ่านง่าย (`opt-color`, `val-black`, `sku-tee-black-m`, `img-tee-main-1`) ของจริงเป็น UUID

| ไฟล์ | ใช้กับ |
|---|---|
| `create/*.json` | `POST /products` |
| `update/*.json` | `PUT /products/:id` (แต่ละไฟล์คือการแก้ไขสินค้าใน `create/` ที่มีชื่อเดียวกัน) |
| `upload-presign.*.json` | `POST /uploads/presign` |
| `stock-adjustments.request.json` | `POST /stock/adjustments` |

## 1. การแก้ไขสินค้า

- ต้องส่ง `version` ที่ได้มาตอนเปิดหน้าแก้ไข ถ้าไม่ตรงกับในฐานข้อมูล ตอบ `409 Conflict` และบันทึกสำเร็จแล้ว `version` จะเพิ่มขึ้น 1
- SKU
  - มี `id`: แก้ไข SKU เดิม
  - ไม่มี `id`: สร้าง SKU ใหม่ (ต้องมี `initialStock`)
  - SKU เดิมที่ไม่อยู่ใน payload: เปลี่ยนเป็น `ARCHIVED` ไม่ลบจริง คำสั่งซื้อเดิมยังอ้างถึงได้ และไม่แสดงในหน้าร้าน
  - ห้ามแก้ `variantIds` ของ SKU เดิม ถ้าต้องการชุดค่าใหม่ ให้สร้าง SKU ใหม่
- รูปและกลุ่มรูปแทนที่ทั้งชุด รูปเดิมที่ไม่อยู่ใน payload จะถูกลบ

| ตัวอย่างใน `update/` | สิ่งที่แก้ |
|---|---|
| 01 | เปลี่ยนราคา และเปลี่ยนรูปหลักรูปที่ 5 เป็นรูปใหม่ |
| 02 | เลิกขายไซส์ L: เอาค่าออกจาก option และเอา SKU ออก (ถูก archive) |
| 03 | เพิ่มรูปให้สีน้ำเงินที่ยังไม่มีรูป |
| 04 | เพิ่มไซส์ XL: SKU ใหม่ 2 ตัว |
| 05 | เพิ่มชุดค่าที่ยังขาด (32 + ยาว) |
| 06 | เรียงลำดับรูปในกลุ่มใหม่ และลบออก 1 รูป |
| 07 | เลิกขาย SKU 1 ตัว (ถูก archive) |
| 08 | เพิ่มรูปให้กลุ่มแดง+จุด และเปิดขาย SKU ที่ปิดไว้ |
| 09 | เพิ่มชุดค่าใหม่ พร้อมกลุ่มรูปของชุดนั้น |

## 2. สต็อก

- payload สินค้าไม่มี `stock`
- ส่ง `initialStock` ได้เฉพาะ SKU ใหม่ (ตอนสร้างสินค้า หรือ SKU ที่ไม่มี `id` ตอนแก้ไข)
- การเปลี่ยนสต็อกหลังจากนั้นทำผ่าน `POST /stock/adjustments` โดยส่ง `delta` (เพิ่ม/ลด) ไม่ใช่ค่าใหม่ เพื่อไม่ให้ทับยอดที่ลูกค้าซื้อไประหว่างนั้น

## 3. รูป

รูปเก็บที่ Supabase Storage bucket `product-images` (public) แบ่ง prefix เป็น `tmp/uploads/` (รอบันทึก) กับ `products/<productId>/` (ใช้งานจริง)

1. ขอ URL อัปโหลดจาก `POST /uploads/presign` backend ตรวจ `contentType` (jpeg/png/webp) กับ `size` แล้วเรียก `createSignedUploadUrl(path)` ด้วย service role key (URL ใช้ได้ 2 ชั่วโมง)
2. frontend อัปโหลดด้วย `supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)` ใช้ anon key ได้ เพราะสิทธิ์มาจาก token
3. ส่ง `path` ที่ได้ (`tmp/uploads/...`) มาใน payload สินค้า

กฎ:
- รูปใหม่ต้องเป็น `path` ที่ขึ้นต้นด้วย `tmp/uploads/` เท่านั้น ส่วนรูปเดิมส่งเป็น `{ "id": ... }` ห้ามส่งทั้ง `id` และ `path` และห้ามส่ง `url`
- รูปเดิม (`id`) ต้องเป็นรูปของสินค้าตัวนี้เท่านั้น (`WHERE id IN (...) AND productId = :id`) ถ้าไม่ใช่ ตอบ 400
- `POST /uploads/presign` บันทึกแถวในตาราง `Upload` (`path`, `uploadedBy`, `status: PENDING`, `expiresAt`) ตอนบันทึกสินค้า `path` ต้องตรงกับแถวที่เป็น `PENDING`, ยังไม่หมดอายุ และอัปโหลดโดยผู้ใช้คนเดียวกัน จากนั้นเปลี่ยนเป็น `USED`
- backend ตรวจว่าไฟล์มีอยู่จริง แล้วอ่าน `width`/`height` จากไฟล์เอง (ไม่เชื่อค่าจาก client) จากนั้น `storage.copy()` ไฟล์ไปที่ `products/<productId>/<imageId>.<ext>` บันทึกฐานข้อมูล แล้วค่อย `storage.remove()` ไฟล์ใน tmp
- Supabase Storage ไม่มี lifecycle rule ต้องมี job ลบไฟล์ `tmp/uploads/` ที่เป็น `PENDING` เกิน 24 ชั่วโมง โดยเรียก `storage.remove([...])` (ห้ามลบแถวใน `storage.objects` ด้วย SQL ตรงๆ เพราะไฟล์จริงจะค้างอยู่)
- ตั้งค่า bucket: `allowedMimeTypes` = jpeg/png/webp, `fileSizeLimit` เช่น 5MB และไม่เปิด policy ให้ insert ใน `storage.objects` แบบสาธารณะ จะได้อัปโหลดได้เฉพาะผ่าน signed URL
- รูปหลักมี 1–5 รูป และกลุ่มรูปแต่ละกลุ่มมี 0–5 รูป `sortOrder` อยู่ระหว่าง 0–4 และไม่ซ้ำกัน
- กลุ่มที่ไม่มีรูปไม่ต้องส่ง หน้าร้านจะใช้รูปหลักแทน
