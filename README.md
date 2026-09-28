
  # Creator Influencer Registration App

  This is a code bundle for Creator Influencer Registration App. The original project is available at https://www.figma.com/design/WxP5p9czan03WugQWLx0i3/KOL-Influencer-Registration-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the **Next.js** dev server (default: [http://localhost:3000/creatorclub](http://localhost:3000/creatorclub) — `basePath` is `/creatorclub`).

  Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_*` variables (Supabase, Facebook, optional SMTP for password recovery emails).

  ## Documentation

  - [Register Field Visibility by Invite Type](docs/register-field-visibility-by-invite-type.md)

  ## Supabase Storage (Facebook profile images)

  When users register with Facebook, their profile picture is uploaded to Supabase Storage so it can be displayed reliably (Facebook’s image URLs often return 404 in the browser). Create a bucket named **`profile-images`** and make it **public**:

  - In Supabase Dashboard: **Storage** → **New bucket** → name: `profile-images` → enable **Public bucket**.
  - If the bucket is missing, the app falls back to Facebook’s URL (which may 404); profile images will still work for users who upload a custom image later.

## Creators Bootcamp — ซ่อนชั่วคราว (28 Sep 2026)

สองจุดนี้ถูกปิดไว้ชั่วคราว หน้าภารกิจ (`CreatorBootupMissionPage`) และค่า `BOOTCAMP_MISSION_ENABLED = true` ใน `src/modules/components/event/bootcamp-survey.ts` ยังอยู่ครบ เอากลับได้ตามขั้นตอนด้านล่าง

### 1. แบนเนอร์บนหน้าโปรไฟล์ครีเอเตอร์

เอาออกจาก `src/modules/components/creator/CreatorProfile.tsx` แล้ว แบนเนอร์เดิมโชว์เฉพาะครีเอเตอร์ที่เช็คอินงาน (`isShowup`) และลิงก์ไป `/creator-bootcamp-mission`

**Imports ที่ต้องใส่กลับ**

```tsx
import Link from 'next/link';
import { ArrowRight, Camera, Loader2 } from 'lucide-react';
```

ใน import จาก `../../utils/storage` ใส่ `getCreatorEventParticipation` และ `getEventBySlug` กลับเข้าไปด้วย

```tsx
import {
  BOOTCAMP_EVENT_SLUG,
  BOOTCAMP_MISSION_ENABLED,
  BOOTCAMP_MISSION_PATH,
} from '../event/bootcamp-survey';
import { stripHtmlTags } from '../../utils/strip-html-tags';
```

**State** — ใส่หลัง `addressSectionRef`

```tsx
const [bootcampMissionBannerTitle, setBootcampMissionBannerTitle] = useState<string | null>(null);
```

**โหลดแบนเนอร์** — ใส่ `useEffect` นี้หลัง effect ของ `searchParams`

```tsx
useEffect(() => {
  if (!BOOTCAMP_MISSION_ENABLED || !creatorId) {
    setBootcampMissionBannerTitle(null);
    return;
  }

  let cancelled = false;
  const loadBootcampBanner = async () => {
    try {
      const event = await getEventBySlug(BOOTCAMP_EVENT_SLUG, { includeInactive: true });
      if (!event || cancelled) {
        if (!cancelled) setBootcampMissionBannerTitle(null);
        return;
      }
      const participation = await getCreatorEventParticipation(event.id, creatorId);
      if (cancelled) return;
      if (!participation?.isShowup) {
        setBootcampMissionBannerTitle(null);
        return;
      }
      setBootcampMissionBannerTitle(
        stripHtmlTags(event.name) || 'Creators Bootcamp Mission',
      );
    } catch (error) {
      console.error('Error loading bootcamp mission banner:', error);
      if (!cancelled) setBootcampMissionBannerTitle(null);
    }
  };

  void loadBootcampBanner();
  return () => {
    cancelled = true;
  };
}, [creatorId]);
```

**JSX** — ใส่กลับระหว่างหัวข้อชื่อครีเอเตอร์กับการ์ดโปรไฟล์สีขาว

```tsx
{bootcampMissionBannerTitle ? (
  <Link
    href={BOOTCAMP_MISSION_PATH}
    className="group relative mb-6 block w-full overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  >
    <div className="relative flex min-h-[148px] w-full items-center overflow-hidden bg-[#0a2d71] px-5 py-6 sm:min-h-[168px] sm:px-8 md:min-h-[188px] md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[78%] sm:w-[68%] md:w-[58%]"
        style={{
          backgroundImage:
            'url(https://assetwise.co.th/wp-content/uploads/2026/09/bootcamp-banner-no-text-expanded.webp)',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#0a2d71_0%,#0a2d71_28%,rgba(10,45,113,0.88)_48%,rgba(10,45,113,0.35)_72%,transparent_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.6'/></svg>`,
          )}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '140px 140px',
        }}
      />
      <div className="relative z-10 flex max-w-md flex-col items-start gap-4 text-left">
        <div className="space-y-1.5">
          <p className="text-lg font-medium leading-snug tracking-tight text-white sm:text-xl md:text-2xl">
            {bootcampMissionBannerTitle}
          </p>
          <p className="text-[13px] text-white/80 sm:text-sm">
            ทำภารกิจครบ รับ <span className="font-semibold text-orange-500">Ulanzi SK26</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0a1628] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-[1.03]">
          ไปทำภารกิจ
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  </Link>
) : null}
```

### 2. Redirect `/creator-bootcamp-mission` ไปหน้าแรก

`src/app/creator-bootcamp-mission/page.tsx` เรียก `redirect('/')` ตอนนี้ ถ้าจะเปิดหน้าภารกิจอีกครั้ง ให้แทนที่ทั้งไฟล์ด้วยเนื้อหาเดิมด้านล่าง (`CreatorBootupMissionPage` ยังอยู่ที่ `src/modules/components/event/CreatorBootupMissionPage.tsx`)

```tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CreatorBootupMissionPage } from '@/modules/components/event/CreatorBootupMissionPage';

export const metadata: Metadata = {
  title: 'Creators Bootcamp Mission',
};

export default function CreatorBootcampMissionRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          กำลังโหลด...
        </div>
      }
    >
      <CreatorBootupMissionPage />
    </Suspense>
  );
}
```
