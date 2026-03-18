import { CreatorProfile } from '../types';

type ApprovalStatusCode = 0 | 1 | 2 | 3;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USERNAME = process.env.SMTP_USERNAME;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS;

const ensureSmtpConfig = () => {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USERNAME || !SMTP_PASSWORD || !SMTP_FROM_ADDRESS) {
    console.error('SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_ADDRESS.');
    throw new Error('SMTP configuration is incomplete');
  }
};

const buildApprovalEmailHtml = (creator: CreatorProfile) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>AssetWise Creators Club - Approved</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f5; margin: 0; padding: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 16px; padding: 32px;">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">ยินดีต้อนรับสู่ AssetWise Creators Club</h1>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      สวัสดีคุณ ${creator.name},
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      คำขอเข้าร่วมของคุณได้รับการ<strong>อนุมัติ</strong>เรียบร้อยแล้ว คุณสามารถเริ่มต้นใช้งานแพลตฟอร์มสำหรับ Creators ของเราได้ทันที
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      หากคุณมีข้อสงสัยหรือพบปัญหาในการใช้งาน สามารถติดต่อทีมงานได้ผ่านช่องทางที่ระบุในเว็บไซต์
                    </p>
                    <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
                      ขอบคุณที่เข้าร่วมเป็นส่วนหนึ่งของ AssetWise Creators Club
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const buildRejectionEmailHtml = (creator: CreatorProfile) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>AssetWise Creators Club - Application Result</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f5; margin: 0; padding: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 16px; padding: 32px;">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">ผลการพิจารณาเข้าร่วม AssetWise Creators Club</h1>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      สวัสดีคุณ ${creator.name},
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      หลังจากการตรวจสอบคำขอของคุณ ทีมงานขอแจ้งให้ทราบว่า<strong>ไม่สามารถอนุมัติ</strong>คำขอเข้าร่วมได้ในขณะนี้
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      คุณสามารถติดต่อทีมงานเพื่อสอบถามข้อมูลเพิ่มเติม หรือลองสมัครใหม่อีกครั้งในอนาคตได้เช่นกัน
                    </p>
                    <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
                      ขอบคุณที่ให้ความสนใจใน AssetWise Creators Club
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

interface SmtpPayload {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * This function assumes you'll wire it to a backend handler
 * that knows how to talk to Outlook SMTP using this payload.
 * For now it just returns the payload so API routes can send it.
 */
export const buildSmtpPayload = (params: Omit<SmtpPayload, 'host' | 'port' | 'username' | 'password' | 'from'>): SmtpPayload => {
  ensureSmtpConfig();

  return {
    host: SMTP_HOST as string,
    port: parseInt(SMTP_PORT as string, 10),
    username: SMTP_USERNAME as string,
    password: SMTP_PASSWORD as string,
    from: SMTP_FROM_ADDRESS as string,
    ...params,
  };
};

export const buildApprovalEmailPayload = (creator: CreatorProfile): SmtpPayload => {
  const html = buildApprovalEmailHtml(creator);
  return buildSmtpPayload({
    to: creator.email,
    subject: 'AssetWise Creators Club - อนุมัติการเข้าร่วม',
    html,
  });
};

export const buildRejectionEmailPayload = (creator: CreatorProfile): SmtpPayload => {
  const html = buildRejectionEmailHtml(creator);
  return buildSmtpPayload({
    to: creator.email,
    subject: 'AssetWise Creators Club - ผลการพิจารณา',
    html,
  });
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatusCode, string> = {
  0: 'ถูกปฏิเสธ',
  1: 'อนุมัติแล้ว',
  2: 'ไม่ใช้งาน',
  3: 'รอการอนุมัติ',
};

