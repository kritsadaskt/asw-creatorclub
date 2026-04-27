import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sanitizeSocialAccounts, type SocialAccountsInput } from '@/modules/utils/social-url';

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
    const rawSocialAccounts =
      creator.socialAccounts !== null &&
      typeof creator.socialAccounts === 'object' &&
      !Array.isArray(creator.socialAccounts)
        ? creator.socialAccounts
        : {};
    const socialAccounts = sanitizeSocialAccounts(rawSocialAccounts as SocialAccountsInput);

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
        category:
          Array.isArray(creator.categories) && creator.categories.length > 0 ? creator.categories[0] : null,
        categories: Array.isArray(creator.categories) ? creator.categories : [],
        followers: typeof creator.followers === 'number' ? creator.followers : 0,
        profile_image: typeof creator.profileImage === 'string' ? creator.profileImage : null,
        social_accounts: socialAccounts,
        follower_counts: typeof creator.followerCounts === 'object' ? creator.followerCounts : {},
        budgets: typeof creator.budgets === 'object' ? creator.budgets : {},
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
