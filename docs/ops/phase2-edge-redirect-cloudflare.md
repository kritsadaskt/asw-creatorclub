# Phase 2 — Edge redirect: `assetwise.co.th/c/{code}` → TinyURL

Seed (Phase 1) เสร็จแล้ว: `https://link.assetwise.co.th/{code}` ชี้ destination ถูกต้อง  
ขั้นนี้ทำให้ลิงก์เก่าในแชท/โพสต์ยังใช้ได้โดยไม่พึ่ง Shlink ระยะยาว

## เป้าหมาย

| จาก | ไป |
|-----|-----|
| `https://assetwise.co.th/c/{code}` | `301 https://link.assetwise.co.th/{code}` |

ตัวอย่าง: `/c/7Wysn` → `https://link.assetwise.co.th/7Wysn` → long URL เดิม

## สถานะปัจจุบัน (ก่อนตั้ง rule)

- `assetwise.co.th/c/...` ยังตอบจาก **Shlink** (302 ตรงไป destination) ผ่าน Cloudflare
- `link.assetwise.co.th/...` ตอบจาก **TinyURL** (301 ไป destination)

รีโป CreatorClub **ตั้ง rule บน Cloudflare ของ assetwise.co.th ให้ไม่ได้** — ต้องทำใน CF dashboard / infra ของโดเมนหลัก

## Cloudflare — วิธีที่แนะนำ (Wildcard Redirect, Free/Pro ได้)

> **อย่าใช้** `regex_replace(...)` ใน target URL — ฟังก์ชันนี้ต้อง **Business** หรือ **WAF Advanced**  
> ถ้าเจอ error: `not entitled: the use of function regex_replace is not allowed` → ใช้ **Wildcard pattern** ด้านล่างแทน (มีบน Free/Pro)

1. Cloudflare → zone `assetwise.co.th` → **Rules** → **Redirect Rules** → Create rule  
2. Rule name: `creatorclub-shlink-c-to-tinyurl`  
3. When incoming requests match: เลือก **Wildcard pattern** (ไม่ใช่ Custom filter expression)  
4. Request URL:

```txt
https://assetwise.co.th/c/*
```

5. Then:
   - Target URL:

```txt
https://link.assetwise.co.th/${1}
```

   - Status: **301**  
   - Preserve query string: **No** (short links โดยปกติไม่มี query บน short URL)

6. Deploy — วาง rule **เหนือ** page rules / redirect อื่นที่อาจแย่ง path `/c/*` ถ้ามี

ผลลัพธ์: `https://assetwise.co.th/c/7Wysn` → `301 Location: https://link.assetwise.co.th/7Wysn`

### ถ้าต้องรองรับทั้ง http และ https

Request URL:

```txt
http*://assetwise.co.th/c/*
```

Target URL เหมือนเดิม: `https://link.assetwise.co.th/${1}`

### ถ้ามี traffic บน `www.assetwise.co.th`

สร้าง rule เพิ่ม (หรือ wildcard host) เช่น:

```txt
https://www.assetwise.co.th/c/*
→ https://link.assetwise.co.th/${1}
```

### ทางเลือก (ถ้า Wildcard UI ไม่มี / ติดข้อจำกัดอื่น)

**A) Dynamic + `wildcard_replace` (Free/Pro ได้ — ไม่ใช่ regex)**

When: Custom filter

```txt
(http.host eq "assetwise.co.th" and starts_with(http.request.uri.path, "/c/"))
```

Then → Dynamic target expression:

```txt
wildcard_replace(http.request.full_uri, "https://assetwise.co.th/c/*", "https://link.assetwise.co.th/${1}")
```

**B) Cloudflare Worker** (fallback)

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/c\/([^/]+)\/?$/);
    if (!m) return fetch(request);
    return Response.redirect(`https://link.assetwise.co.th/${m[1]}`, 301);
  },
};
```

Route: `assetwise.co.th/c/*`

**C) Nginx (ถ้าไม่ใช้ CF rule)**

```nginx
location ~ ^/c/([^/]+)/?$ {
  return 301 https://link.assetwise.co.th/$1;
}
```

## ตรวจหลัง deploy

```bash
# ต้องได้ 301 ไป link.assetwise.co.th/{code} ไม่ใช่ 302 ตรงไป long URL จาก Shlink
curl -sI --max-redirs 0 'https://assetwise.co.th/c/7Wysn'

# แล้ว TinyURL ต้อง 301 ต่อไปยัง destination
curl -sI --max-redirs 0 'https://link.assetwise.co.th/7Wysn'

# หรือรันสคริปต์ในรีโป
node scripts/verify-shortlink-redirects.mjs
```

คาดหวังหลัง Phase 2 สำเร็จ:

```txt
assetwise.co.th/c/7Wysn  → 301 Location: https://link.assetwise.co.th/7Wysn
link.assetwise.co.th/7Wysn → 301 Location: https://assetwise.co.th/... (longUrl)
```

## Rollback

- Disable / delete Redirect Rule ใน Cloudflare  
- Traffic กลับไป Shlink ที่ยังรันอยู่ (อย่าปิด Shlink จนกว่า Phase 4)

## หลัง Phase 2 ผ่าน

ตรวจ Vercel มี `TINY_URL_API_KEY` + `YOUR_TINYURL_DOMAIN` แล้วค่อยเปิด Get Link (`NEXT_PUBLIC_AFFILIATE_GET_LINK_ENABLED=true`) เมื่อพร้อม
