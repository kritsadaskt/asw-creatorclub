import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequestWithSession, readJson } from '@/test-utils/session-request';

const mockGetCreatorApprovalStatus = vi.fn();

vi.mock('@/lib/require-approved-creator', () => ({
  getCreatorApprovalStatus: (...args: unknown[]) => mockGetCreatorApprovalStatus(...args),
}));

import { GET } from './route';

type MeResponse = {
  id: string;
  role: string;
  approvalStatus: number | null;
  canLogin?: boolean;
  canAccessCreatorDashboard?: boolean;
  canGenerateAffiliateLink?: boolean;
  blockMessage?: string | null;
  error?: string;
};

describe('GET /api/creators/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    const request = createRequestWithSession(null);
    const { status, body } = await readJson<{ error: string }>(await GET(request));
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns full access flags for admin', async () => {
    const request = createRequestWithSession({ id: 'admin-1', role: 'admin' });
    const { status, body } = await readJson<MeResponse>(await GET(request));
    expect(status).toBe(200);
    expect(body.canLogin).toBe(true);
    expect(body.canAccessCreatorDashboard).toBe(true);
    expect(body.canGenerateAffiliateLink).toBe(true);
    expect(mockGetCreatorApprovalStatus).not.toHaveBeenCalled();
  });

  it.each([
    [1, true, true, true, null],
    [2, false, false, false, 'ไม่ใช้งาน'],
    [3, false, false, false, 'รอการอนุมัติ'],
    [0, false, false, false, 'ปฏิเสธ'],
  ] as const)(
    'creator status %i → canLogin=%s dashboard=%s affiliate=%s',
    async (approvalStatus, canLogin, dashboard, affiliate, messagePart) => {
      mockGetCreatorApprovalStatus.mockResolvedValue(approvalStatus);
      const request = createRequestWithSession({ id: 'creator-1', role: 'creator' });
      const { status, body } = await readJson<MeResponse>(await GET(request));

      expect(status).toBe(200);
      expect(body.approvalStatus).toBe(approvalStatus);
      expect(body.canLogin).toBe(canLogin);
      expect(body.canAccessCreatorDashboard).toBe(dashboard);
      expect(body.canGenerateAffiliateLink).toBe(affiliate);
      if (messagePart) {
        expect(body.blockMessage).toContain(messagePart);
      } else {
        expect(body.blockMessage).toBeNull();
      }
    },
  );

  it('returns 404 when profile not found', async () => {
    mockGetCreatorApprovalStatus.mockResolvedValue(null);
    const request = createRequestWithSession({ id: 'ghost', role: 'creator' });
    const { status, body } = await readJson<{ error: string }>(await GET(request));
    expect(status).toBe(404);
    expect(body.error).toBe('Profile not found');
  });
});
