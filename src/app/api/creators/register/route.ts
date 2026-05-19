import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sanitizeSocialAccounts, type SocialAccountsInput } from '@/modules/utils/social-url';
import {
  buildCreatorCategoryMaps,
  resolveIdsFromLabels,
  resolveThLabelsFromIds,
  type CreatorCategoryRow,
} from '@/modules/utils/creatorCategoryLookup';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const creator = (body as { creator?: unknown }).creator as Record<string, unknown> | undefined;

  if (!creator || typeof creator !== 'object') {
    return NextResponse.json({ error: 'Missing creator payload' }, { status: 400 });
  }

  const id = typeof creator.id === 'string' ? creator.id : '';
  const email = typeof creator.email === 'string' ? creator.email : '';
  const name = typeof creator.name === 'string' ? creator.name : '';
  const phone = typeof creator.phone === 'string' ? creator.phone : '';
  const createdAt = typeof creator.createdAt === 'string' ? creator.createdAt : new Date().toISOString();

  if (!id || !email || !name) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
  }

  try {
    const parseBudget = (raw: unknown): number | null => {
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      if (typeof raw === 'string' && raw.trim()) {
        const n = Number(raw);
        if (Number.isFinite(n)) return n;
      }
      return null;
    };

    const rawSocialAccounts =
      creator.socialAccounts !== null &&
      typeof creator.socialAccounts === 'object' &&
      !Array.isArray(creator.socialAccounts)
        ? creator.socialAccounts
        : {};
    const socialAccounts = sanitizeSocialAccounts(rawSocialAccounts as SocialAccountsInput);
    const rawFollowerCounts =
      creator.followerCounts !== null &&
      typeof creator.followerCounts === 'object' &&
      !Array.isArray(creator.followerCounts)
        ? (creator.followerCounts as Record<string, unknown>)
        : {};
    const socialPlatforms = ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'lemon8'] as const;
    const followerCounts = Object.fromEntries(
      socialPlatforms.map((platform) => {
        const raw = rawFollowerCounts[platform];
        if (typeof raw === 'number' && Number.isFinite(raw)) return [platform, raw];
        if (typeof raw === 'string' && raw.trim()) {
          const n = Number(raw);
          if (Number.isFinite(n)) return [platform, n];
        }
        return [platform, undefined];
      }),
    ) as Record<(typeof socialPlatforms)[number], number | undefined>;
    const hasSocialWithFollower = socialPlatforms.some((platform) => {
      const hasSocial = Boolean(socialAccounts[platform]);
      const followers = followerCounts[platform];
      return hasSocial && typeof followers === 'number' && Number.isFinite(followers);
    });
    if (!hasSocialWithFollower) {
      return NextResponse.json(
        { error: 'กรุณากรอก Social และจำนวนผู้ติดตามอย่างน้อย 1 ช่องทาง' },
        { status: 400 },
      );
    }
    const budget = parseBudget(creator.budget);

    const parseCategoryIdsFromPayload = (raw: unknown): string[] => {
      if (!Array.isArray(raw)) return [];
      const out: string[] = [];
      for (const x of raw) {
        if (typeof x === 'number' && Number.isFinite(x)) {
          out.push(String(Math.trunc(x)));
        } else if (typeof x === 'string' && /^\d+$/.test(x.trim())) {
          out.push(x.trim());
        }
      }
      return out;
    };

    const { data: catRows, error: catErr } = await supabaseAdmin
      .from('creator_categories')
      .select('id,th_label,en_label')
      .eq('is_active', true);
    if (catErr) throw catErr;
    const catMaps = buildCreatorCategoryMaps((catRows ?? []) as CreatorCategoryRow[]);

    let categoryIds = parseCategoryIdsFromPayload(creator.categoryIds);
    const legacyLabels = Array.isArray(creator.categories)
      ? creator.categories.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      : [];
    if (categoryIds.length === 0 && legacyLabels.length > 0) {
      categoryIds = resolveIdsFromLabels(legacyLabels, catMaps);
    }
    const categoryThLabels =
      categoryIds.length > 0 ? resolveThLabelsFromIds(categoryIds, catMaps) : legacyLabels;

    const rawPageantYear = creator.pageantYear;
    let pageant_year: number | null = null;
    if (typeof rawPageantYear === 'number' && Number.isFinite(rawPageantYear)) {
      pageant_year = Math.trunc(rawPageantYear);
    } else if (typeof rawPageantYear === 'string' && rawPageantYear.trim()) {
      const n = parseInt(rawPageantYear.trim(), 10);
      pageant_year = Number.isFinite(n) ? n : null;
    }

    const { error } = await supabaseAdmin.from('profiles').upsert(
      {
        id,
        email,
        name,
        lastname: typeof creator.lastName === 'string' ? creator.lastName : null,
        dob: typeof creator.dob === 'string' ? creator.dob : null,
        phone: phone || null,
        base_location: typeof creator.baseLocation === 'string' ? creator.baseLocation : null,
        province: typeof creator.province === 'string' ? creator.province : null,
        type: typeof creator.type === 'string' ? creator.type : null,
        pageant_year,
        category: categoryThLabels.length > 0 ? categoryThLabels[0] : null,
        categories: categoryThLabels,
        category_ids: categoryIds,
        followers: typeof creator.followers === 'number' ? creator.followers : 0,
        profile_image: typeof creator.profileImage === 'string' ? creator.profileImage : null,
        social_accounts: socialAccounts,
        follower_counts: followerCounts,
        budget_per_post: budget,
        approval_status: 3,
        status: typeof creator.status === 'string' ? creator.status : null,
        project_name: typeof creator.projectName === 'string' ? creator.projectName : null,
        created_at: createdAt,
        role: 'creator',
        facebook_id: typeof creator.facebookId === 'string' ? creator.facebookId : null,
        password_hash: typeof creator.passwordHash === 'string' ? creator.passwordHash : null,
      },
      { onConflict: 'id' },
    );

    if (error) throw error;

    return NextResponse.json({ creatorId: id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/creators/register:', err);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:creators/register',
      severity: 'error',
      error: err,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
