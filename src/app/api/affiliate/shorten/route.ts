import { NextRequest, NextResponse } from 'next/server';

const SHLINK_BASE = 'https://assetwise.co.th/c';

export async function POST(request: NextRequest) {
  const apiKey = process.env.SHLINK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Shlink API key not configured' }, { status: 503 });
  }

  let creatorId: string;
  try {
    const body = await request.json();
    creatorId = body.creatorId;
    if (!creatorId || typeof creatorId !== 'string') {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const longUrl = `https://assetwise.co.th/creatorclub/?ref=${creatorId}`;
  const customSlug = `ref-${creatorId.slice(0, 8)}`;

  let shlinkRes: Response;
  try {
    shlinkRes = await fetch(`${SHLINK_BASE}/rest/v3/short-urls`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ longUrl, customSlug, findIfExists: true }),
    });
  } catch (err) {
    console.error('Shlink fetch error:', err);
    return NextResponse.json({ error: 'Failed to reach Shlink service' }, { status: 502 });
  }

  if (!shlinkRes.ok) {
    const detail = await shlinkRes.text().catch(() => '');
    console.error('Shlink error response:', shlinkRes.status, detail);
    return NextResponse.json(
      { error: 'Shlink returned an error', detail },
      { status: 502 },
    );
  }

  const data = await shlinkRes.json();
  return NextResponse.json({ shortUrl: data.shortUrl });
}
