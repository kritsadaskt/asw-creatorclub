import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

function getClientIp(req: NextRequest): string | undefined {
  const xf = req.headers.get('x-forwarded-for');
  if (!xf) return undefined;
  const first = xf.split(',')[0]?.trim();
  return first || undefined;
}

async function verifyTurnstile(params: {
  token: string;
  remoteip?: string;
}): Promise<{ ok: true } | { ok: false; codes?: string[] }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, codes: ['TURNSTILE_SECRET_KEY_NOT_CONFIGURED'] };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', params.token);
  if (params.remoteip) body.set('remoteip', params.remoteip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = (await res.json().catch(() => null)) as TurnstileVerifyResponse | null;
  if (!json?.success) return { ok: false, codes: json?.['error-codes'] };
  return { ok: true };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const token = (body as { token?: unknown }).token;
  const creator = (body as { creator?: unknown }).creator as Record<string, unknown> | undefined;

  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ error: 'Missing Turnstile token' }, { status: 400 });
  }
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

  const verify = await verifyTurnstile({ token: token.trim(), remoteip: getClientIp(request) });
  if (!verify.ok) {
    return NextResponse.json(
      { error: 'Turnstile verification failed', codes: verify.codes ?? [] },
      { status: 400 },
    );
  }

  try {
    const { error } = await supabaseAdmin.from('profiles').upsert(
      {
        id,
        email,
        name,
        lastname: typeof creator.lastName === 'string' ? creator.lastName : null,
        phone: phone || null,
        base_location: typeof creator.baseLocation === 'string' ? creator.baseLocation : null,
        province: typeof creator.province === 'string' ? creator.province : null,
        type: typeof creator.type === 'string' ? creator.type : null,
        category:
          Array.isArray(creator.categories) && creator.categories.length > 0 ? creator.categories[0] : null,
        categories: Array.isArray(creator.categories) ? creator.categories : [],
        followers: typeof creator.followers === 'number' ? creator.followers : 0,
        profile_image: typeof creator.profileImage === 'string' ? creator.profileImage : null,
        social_accounts: typeof creator.socialAccounts === 'object' ? creator.socialAccounts : {},
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
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

