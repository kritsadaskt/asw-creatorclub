import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createRequestWithSession, readJson } from '@/test-utils/session-request';

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  getCreatorApprovalStatus,
  requireApprovedCreatorSession,
  requireCreatorSession,
} from './require-approved-creator';

function mockProfileStatus(status: number | null, error = false) {
  if (error) {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'db error' } });
    return;
  }
  if (status === null) {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    return;
  }
  mockMaybeSingle.mockResolvedValue({ data: { approval_status: status }, error: null });
}

describe('require-approved-creator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCreatorApprovalStatus', () => {
    it('returns approval status from database', async () => {
      mockProfileStatus(2);
      await expect(getCreatorApprovalStatus('creator-1')).resolves.toBe(2);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('defaults to pending (3) when approval_status is invalid', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { approval_status: 'bad' }, error: null });
      await expect(getCreatorApprovalStatus('creator-1')).resolves.toBe(3);
    });

    it('returns null when profile not found', async () => {
      mockProfileStatus(null);
      await expect(getCreatorApprovalStatus('missing')).resolves.toBeNull();
    });
  });

  describe('requireCreatorSession', () => {
    it('returns 401 without session cookie', async () => {
      const request = new NextRequest('http://localhost/api/test');
      const result = await requireCreatorSession(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const { status, body } = await readJson<{ error: string }>(result.response);
        expect(status).toBe(401);
        expect(body.error).toBe('Unauthorized');
      }
    });

    it('returns 401 for admin session', async () => {
      const request = createRequestWithSession({ id: 'admin-1', role: 'admin' });
      const result = await requireCreatorSession(request);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
    });

    it.each([0, 2, 3] as const)('returns 403 for non-approved creator status %i', async (status) => {
      mockProfileStatus(status);
      const request = createRequestWithSession({ id: `creator-${status}`, role: 'creator' });
      const result = await requireCreatorSession(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        const { body } = await readJson<{ error: string }>(result.response);
        expect(body.error.length).toBeGreaterThan(0);
      }
    });

    it('allows approved creator (status 1)', async () => {
      mockProfileStatus(1);
      const request = createRequestWithSession({ id: 'creator-1', role: 'creator' });
      const result = await requireCreatorSession(request);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.approvalStatus).toBe(1);
        expect(result.session.id).toBe('creator-1');
      }
    });
  });

  describe('requireApprovedCreatorSession', () => {
    it.each([2, 3] as const)('returns 403 for status %i (inactive/pending)', async (status) => {
      mockProfileStatus(status);
      const request = createRequestWithSession({ id: `creator-${status}`, role: 'creator' });
      const result = await requireApprovedCreatorSession(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const { status: httpStatus, body } = await readJson<{ error: string }>(result.response);
        expect(httpStatus).toBe(403);
        expect(body.error).toContain('ไม่สามารถเข้าสู่ระบบได้');
      }
    });

    it('allows approved creator (status 1)', async () => {
      mockProfileStatus(1);
      const request = createRequestWithSession({ id: 'creator-approved', role: 'creator' });
      const result = await requireApprovedCreatorSession(request);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.session.approvalStatus).toBe(1);
        expect(result.session.id).toBe('creator-approved');
      }
    });
  });
});
