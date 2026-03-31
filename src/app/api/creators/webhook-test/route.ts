import { NextRequest, NextResponse } from 'next/server';

type WebhookPayload = {
  uid: string;
  socialAccounts: Record<string, string | undefined>;
  email?: string;
  name?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebhookPayload;

    if (!body?.uid || !body?.socialAccounts) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const webhookUrl = process.env.WEBHOOK_PROD;

    if (!webhookUrl) {
      console.error('WEBHOOK is not configured');
      // Treat as success in non-configured environments to avoid blocking registration
      return NextResponse.json({ success: true, dev: true });
    }

    const upstreamResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!upstreamResponse.ok) {
      const text = await upstreamResponse.text().catch(() => '');
      console.error('WEBHOOK call failed', upstreamResponse.status, text);
      return NextResponse.json({ error: 'WEBHOOK_CALL_FAILED' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WEBHOOK handler error:', error);
    return NextResponse.json({ error: 'WEBHOOK_CALL_ERROR' }, { status: 500 });
  }
}

