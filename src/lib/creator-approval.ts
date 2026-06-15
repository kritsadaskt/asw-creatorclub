export type CreatorApprovalStatus = 0 | 1 | 2 | 3;

export function isCreatorLoginAllowed(status: CreatorApprovalStatus): boolean {
  return status === 1;
}

/** Approved creators only — dashboard + affiliate link generation. */
export function isCreatorApproved(status: CreatorApprovalStatus): boolean {
  return status === 1;
}

export function creatorApprovalBlockMessage(status: CreatorApprovalStatus): string {
  if (status === 0) return 'บัญชีนี้ถูกปฏิเสธการอนุมัติและไม่สามารถเข้าสู่ระบบได้';
  if (status === 2) return 'บัญชีนี้อยู่ในสถานะไม่ใช้งาน ไม่สามารถเข้าสู่ระบบได้';
  if (status === 3) return 'บัญชีของคุณอยู่ระหว่างรอการอนุมัติ ยังไม่สามารถเข้าสู่ระบบได้';
  return 'ไม่สามารถเข้าใช้งานส่วนนี้ได้';
}

export function parseCreatorApprovalStatus(raw: unknown): CreatorApprovalStatus | null {
  if (typeof raw !== 'number' || ![0, 1, 2, 3].includes(raw)) return null;
  return raw as CreatorApprovalStatus;
}
