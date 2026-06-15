import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequestWithSession, readJson } from '@/test-utils/session-request';

const mockRequireApproved = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockEqUrl = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqCreator = vi.fn(() => ({ eq: mockEqUrl }));
const mockSelect = vi.fn(() => ({ eq: mockEqCreator }));
const mockFrom = vi.fn(() => ({ select: mockSelect, insert: mockInsert }));

vi.mock('@/lib/require-approved-creator', () => ({
  requireApprovedCreatorSession: (...args: unknown[]) => mockRequireApproved(...args),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/log-server-error', () => ({
  logServerError: vi.fn(),
  requestLogContext: vi.fn(() => ({})),
}));

import { POST } from './route';

function jsonPost(session: { id: string; role: 'creator' } | null, body: Record<string, unknown>) {
  const request = createRequestWithSession(session, 'http://localhost/creatorclub/api/affiliate/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return request;
}

describe('POST /api/affiliate/links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns auth error when not approved', async () => {
    mockRequireApproved.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Creator not approved' }), { status: 403 }),
    });

    const request = jsonPost({ id: 'creator-pending', role: 'creator' }, {
      url: 'https://example.com',
      campaignName: 'Test',
    });
    const { status, body } = await readJson<{ error: string }>(await POST(request));
    expect(status).toBe(403);
    expect(body.error).toBe('Creator not approved');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthorized', async () => {
    mockRequireApproved.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const request = jsonPost(null, { url: 'https://example.com', campaignName: 'Test' });
    const { status } = await readJson(await POST(request));
    expect(status).toBe(401);
  });

  it('returns 400 when url or campaignName missing', async () => {
    mockRequireApproved.mockResolvedValue({
      ok: true,
      session: { id: 'creator-approved', role: 'creator', approvalStatus: 1 as const },
    });

    const request = jsonPost({ id: 'creator-approved', role: 'creator' }, { url: 'https://example.com' });
    const { status, body } = await readJson<{ error: string }>(await POST(request));
    expect(status).toBe(400);
    expect(body.error).toContain('required');
  });

  it('creates affiliate link for approved creator', async () => {
    mockRequireApproved.mockResolvedValue({
      ok: true,
      session: { id: 'creator-approved', role: 'creator', approvalStatus: 1 as const },
    });

    const request = jsonPost({ id: 'creator-approved', role: 'creator' }, {
      url: 'https://assetwise.co.th/project',
      campaignName: 'Summer Campaign',
      projectId: 'proj-1',
    });
    const { status, body } = await readJson<{ success: boolean; duplicate: boolean; id: string }>(
      await POST(request),
    );

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.duplicate).toBe(false);
    expect(mockFrom).toHaveBeenCalledWith('affiliate_links');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        creator_id: 'creator-approved',
        url: 'https://assetwise.co.th/project',
        campaign_name: 'Summer Campaign',
        project_id: 'proj-1',
      }),
    );
  });

  it('returns duplicate when same url exists for creator', async () => {
    mockRequireApproved.mockResolvedValue({
      ok: true,
      session: { id: 'creator-approved', role: 'creator', approvalStatus: 1 as const },
    });
    mockMaybeSingle.mockResolvedValue({ data: { id: 'existing-link-id' }, error: null });

    const request = jsonPost({ id: 'creator-approved', role: 'creator' }, {
      url: 'https://assetwise.co.th/existing',
      campaignName: 'Campaign',
    });
    const { status, body } = await readJson<{ success: boolean; duplicate: boolean; id: string }>(
      await POST(request),
    );

    expect(status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(body.id).toBe('existing-link-id');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
