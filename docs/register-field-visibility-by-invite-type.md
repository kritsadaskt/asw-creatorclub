# Register Field Visibility by Invite Type

เอกสารนี้อธิบายวิธีซ่อน/แสดง field ในหน้า `/register` ตาม query parameter `type` (เช่น `/creatorclub/register?type=mu`)

## Flow ของ `type` จาก URL

1. `src/app/register/page.tsx`
   - รับ `searchParams.type`
   - ส่งต่อเป็น `inviteType` ไปที่ `InvitedRegisterPage`
2. `src/modules/components/landing/InvitedRegisterPage.tsx`
   - ส่ง `inviteType` เข้า `RegisterSection`
3. `src/modules/components/landing/RegisterSection.tsx`
   - ใช้ `inviteType` สำหรับควบคุม UI, validation, และ payload ก่อนบันทึก

## จุดที่ต้องแก้เมื่อจะซ่อน/แสดง field

แก้ที่ไฟล์หลัก: `src/modules/components/landing/RegisterSection.tsx`

### 1) เงื่อนไขการแสดงผลใน JSX (UI)

เพิ่มเงื่อนไขจาก `inviteType` ตอน render field โดยตรง เช่น:

```tsx
{inviteType === 'mu' && (
  <Input
    label="ตัวอย่างฟิลด์เฉพาะ MU"
    value={customValue}
    onChange={setCustomValue}
  />
)}
```

หรือซ่อน field:

```tsx
{inviteType !== 'mu' && (
  <Input
    label="ฟิลด์ที่ไม่ต้องการให้ MU เห็น"
    value={someValue}
    onChange={setSomeValue}
  />
)}
```

### 2) Validation ให้สอดคล้องกับ field ที่ซ่อน/แสดง

ใน `validateField(...)` และ logic ก่อน submit ให้เพิ่มเงื่อนไขตาม `inviteType` เสมอ  
เพื่อป้องกันกรณีซ่อน field แล้วโดนบังคับกรอกอยู่

ตัวอย่างแนวคิด:

```ts
if (inviteType !== 'mu') {
  addError('projectName', validateField('projectName', projectName));
}
```

### 3) Payload ก่อนบันทึกลง DB

ตอนประกอบ `newCreator` ให้ map ค่าให้ตรงกับประเภทผู้สมัคร เช่น:

- field ที่ไม่ใช้กับ type นั้น ให้ส่ง `undefined`/`null`
- เก็บ `type: inviteType` เพื่อ track แหล่งผู้สมัคร

ตัวอย่างแนวคิด:

```ts
const newCreator: CreatorProfile = {
  // ...
  type: inviteType,
  projectName: inviteType === 'mu' ? undefined : projectName,
};
```

## แนวทางที่แนะนำ (ดูแลง่ายระยะยาว)

สร้าง config กลางจาก `inviteType` แล้วใช้ร่วมกันทั้ง 3 ส่วน (UI, validation, payload)

ตัวอย่าง:

```ts
type RegisterFieldPolicy = {
  showStatus: boolean;
  showProject: boolean;
  requireProject: boolean;
};

function getRegisterFieldPolicy(inviteType?: string): RegisterFieldPolicy {
  if (inviteType === 'asw_household') {
    return { showStatus: false, showProject: true, requireProject: true };
  }
  if (inviteType === 'mu') {
    return { showStatus: false, showProject: false, requireProject: false };
  }
  return { showStatus: true, showProject: false, requireProject: false };
}
```

จากนั้นใช้ `policy` เดียวกันตอน:

- render field
- validate ตอน submit
- build payload ก่อนเรียก `/api/creators/register`

## เช็กลิสต์หลังแก้

- ทดสอบ URL ปกติ: `/creatorclub/register`
- ทดสอบ URL พร้อม type: `/creatorclub/register?type=mu`
- ทดสอบกรณี submit สำเร็จ และตรวจค่าที่บันทึกใน `profiles.type`
- ตรวจว่าไม่มี field ที่ถูกซ่อนแต่ยังขึ้น validation error
