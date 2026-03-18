# CreatorClub Registration — Bugs & Improvements
**URL:** `https://localhost:5173/creatorclub/`
**Test Date:** 18 March 2026

---

## 🐛 Bugs

### BUG-001 · Email Format Error Not Displayed `[HIGH]`
- **Field:** อีเมล (Email)
- **Issue:** When an invalid email (e.g. `not-an-email`) is entered, the browser detects `typeMismatch: true` and blocks form submission, but **no error message is shown** to the user. Only the label highlight changes — the user cannot tell why the form won't submit.
- **Expected:** Display an error message such as `กรุณากรอกอีเมลที่ถูกต้อง` beneath the field.
- **Fix:** Handle the `typeMismatch` state in the submit/onBlur handler and call `setError('email', { message: '...' })`.

---

### BUG-002 · Province Error Persists After Valid Selection `[HIGH]`
- **Field:** จังหวัดที่คุณอยู่ปัจจุบัน (Province dropdown)
- **Issue:** After selecting a province from the React Select dropdown, the validation error `กรุณาเลือกจังหวัดที่คุณอยู่ปัจจุบัน` **does not clear**. The dropdown visually shows the selected value but the form's validation state is not updated.
- **Expected:** The error disappears immediately upon selection.
- **Fix:** Ensure the React Select `onChange` handler calls `clearErrors('province')`. Verify the `Controller` / `register` integration with the form library is correctly wired.

---

### BUG-003 · Only First Required Field Error Shown on Empty Submit `[MEDIUM]`
- **Field:** All required fields
- **Issue:** Submitting an empty form shows an error **only for the first field** (ชื่อ → `กรุณากรอกชื่อ`). All other required fields remain without error messages. The user must fix and resubmit multiple times to discover all missing fields.
- **Expected:** All field errors are shown simultaneously.
- **Fix:** Use `trigger()` on all fields simultaneously on submit, or use a schema validator (e.g. Yup) that surfaces all errors at once.

---

### BUG-004 · Phone Number Not Validated for Format or Length `[MEDIUM]`
- **Field:** เบอร์โทรศัพท์ (Phone)
- **Issue:** The phone field accepts any value including `123` (3 digits). No length or format validation exists. Invalid numbers are submitted to the backend.
- **Expected:** Reject invalid phone numbers and display `กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (10 หลัก)`.
- **Fix:** Add `pattern="^0[0-9]{9}$"` or equivalent custom validator. Update placeholder to `e.g. 0812345678`.

---

### BUG-005 · Social Media Minimum Requirement Not Enforced `[MEDIUM]`
- **Field:** Social Media section
- **Issue:** The hint text `กรอกข้อมูลอย่างน้อย 1 แพลตฟอร์ม` is shown in gray but is **not enforced**. Submitting with zero social media platforms filled proceeds without any error.
- **Expected:** Block submission and show an error if no platform has been filled.
- **Fix:** Add validation logic that checks whether at least one social media URL field is non-empty before allowing submission.

---

### BUG-006 · Last Name Not Saved to Profile `[MEDIUM]`
- **Field:** นามสกุล (Last Name) → Profile display
- **Issue:** After registration with First Name `ทดสอบ` and Last Name `ระบบ`, the profile page displays only `ทดสอบ` under ชื่อ-นามสกุล. The last name is missing.
- **Expected:** Profile shows `ทดสอบ ระบบ`.
- **Fix:** Verify that both `firstName` and `lastName` are included in the API payload and that the profile renders them together.

---

### BUG-007 · Province Not Saved to Profile `[MEDIUM]`
- **Field:** Province → Profile display
- **Issue:** The selected province (`กรุงเทพมหานคร`) does not appear anywhere on the profile page after registration. The data was either not submitted or not stored.
- **Expected:** Province is displayed on the profile page.
- **Fix:** Fix BUG-002 (province value not registering in form state) to ensure the province is included in the API submission payload.

---

## 💡 Improvements

### IMP-001 · Add Password Visibility Toggle `[LOW]`
Both password fields (`รหัสผ่าน` and `ยืนยันรหัสผ่าน`) have no show/hide toggle. Users cannot verify what they are typing, increasing the chance of accidental mismatches.
→ Add an eye icon button on each password field to toggle between `type="password"` and `type="text"`.

---

### IMP-002 · Add Password Strength Indicator `[LOW]`
No minimum password requirements are communicated. Weak passwords like `password123` are accepted without warning.
→ Add a strength meter (Weak / Medium / Strong) and a hint listing requirements (e.g. minimum 8 characters, at least one number).

---

### IMP-003 · Add Inline (On-Blur) Field Validation `[LOW]`
Errors only appear after clicking the submit button. Users must complete the full form before seeing any feedback.
→ Trigger validation when a user leaves a field (`onBlur`) to give earlier, more helpful feedback.

---

### IMP-004 · Add Terms & Conditions Acceptance Checkbox `[LOW]`
There is no checkbox or link for Terms and Conditions / Privacy Policy. This is a standard legal requirement for user registration.
→ Add a required checkbox: *"I agree to the [Terms and Conditions] and [Privacy Policy]"* before the submit button.

---

### IMP-005 · Validate Social Media URL Format `[LOW]`
Social media URL fields accept any text, including plain usernames or invalid strings.
→ Add URL format validation (must begin with `https://`) or provide clear placeholder guidance showing the expected format (e.g. `https://facebook.com/yourpage`).

---

## ✅ Passing Tests (for reference)

| # | Test Case | Result |
|---|-----------|--------|
| 1 | Password mismatch → error `รหัสผ่านไม่ตรงกัน` shown | ✅ Pass |
| 2 | Province dropdown shows all Thai provinces grouped by region | ✅ Pass |
| 3 | Empty province triggers error on submit | ✅ Pass |
| 4 | Empty first name triggers error `กรุณากรอกชื่อ` | ✅ Pass |
| 5 | Facebook OAuth button present | ✅ Pass |
| 6 | Successful registration redirects to `/creatorclub/profile` | ✅ Pass |
| 7 | Email persisted correctly on profile page | ✅ Pass |
| 8 | Phone number persisted correctly on profile page | ✅ Pass |
| 9 | Facebook URL persisted correctly on profile page | ✅ Pass |
| 10 | Header updates to logged-in state after registration | ✅ Pass |
| 11 | No JavaScript console errors during testing | ✅ Pass |
