import { CreatorProfile } from '../types';

type ApprovalStatusCode = 0 | 1 | 2 | 3;

export type CreatorTransactionalEmailMessage = {
  to: string;
  subject: string;
  html: string;
};

type RegistrationPendingEmailInput = {
  name: string;
  email: string;
};

const buildApprovalEmailHtml = (creator: CreatorProfile) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>CONGRATULATIONS! คุณได้รับคัดเลือกให้เข้าร่วม AssetWise Creator Club</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <table width="750" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 16px;">
                <tr>
                  <td align="center">
                    <img style="max-width: 100%;" src="https://assetwise.co.th/wp-content/uploads/2026/03/asw-creatorclub_approved_email_1080px.jpg" alt="CONGRATULATIONS! คุณได้รับคัดเลือกให้เข้าร่วม AssetWise Creator Club" />
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
        <title>ขอขอบคุณท่านที่ให้ความสนใจเข้าร่วม AssetWise Creator Club</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <img style="max-width: 100%;" src="https://assetwise.co.th/wp-content/uploads/2026/03/asw-creatorclub_thankyou_email02_1080px.jpg" alt="ขอขอบคุณท่านที่ให้ความสนใจเข้าร่วม AssetWise Creator Club" />
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const buildRegistrationPendingEmailHtml = (recipient: RegistrationPendingEmailInput) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>ขอบคุณที่สนใจสมัครเข้าร่วม AssetWise CREATOR CLUB</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 16px;">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827; text-align: center; font-weight: bold;">บริษัท แอสเซทไวส์ จำกัด (มหาชน) ขอขอบคุณคุณ ${recipient.name}</h1>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151; text-align: center;">
                      ที่ให้ความสนใจสมัครเข้าร่วมโปรแกรม AssetWise CREATOR CLUB<br/>
                      เนื่องจากปัจจุบันมีผู้สมัครเข้าร่วมเป็นจำนวนมาก<br/>
                      ทางทีมงานจะดำเนินการพิจารณาและติดต่อกลับภายใน 7 วันทำการ<br/> หากท่านได้รับการคัดเลือกเข้าร่วมโปรแกรม
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151; text-align: center;">
                      ท่านสามารถสอบถามข้อมูลเรื่อง AssetWise CREATOR CLUB ผ่านช่องทาง
                    </p>
                    <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280; text-align: center;">
                      <a href="https://line.me/" title="AssetWise Crator Club" style="margin-right: 16px;">
                        <img src="https://assetwise.co.th/wp-content/uploads/2026/03/lineoa-icon.png" style="width: 20px; height: 20px; margin-right: 8px;" alt="AssetWise Crator Club" />
                        <span>@AssetWiseCratorclub</span>
                      </a>
                      <a href="tel:021680000" title="ติดต่อ AssetWise" style="margin-right: 16px;">
                        <img src="https://assetwise.co.th/wp-content/uploads/2026/03/tel-icon.png" style="width: 20px; height: 20px; margin-right: 8px;" alt="ติดต่อ AssetWise" />
                        <span>02-168-0000</span>
                      </a>
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

export const buildApprovalEmailMessage = (creator: CreatorProfile): CreatorTransactionalEmailMessage => ({
  to: creator.email,
  subject: 'CONGRATULATIONS! คุณได้รับคัดเลือกให้เข้าร่วม AssetWise Creator Club',
  html: buildApprovalEmailHtml(creator),
});

export const buildRejectionEmailMessage = (creator: CreatorProfile): CreatorTransactionalEmailMessage => ({
  to: creator.email,
  subject: 'ขอขอบคุณท่านที่ให้ความสนใจเข้าร่วม AssetWise Creator Club',
  html: buildRejectionEmailHtml(creator),
});

export const buildRegistrationPendingEmailMessage = (
  recipient: RegistrationPendingEmailInput,
): CreatorTransactionalEmailMessage => ({
  to: recipient.email,
  subject: 'ขอบคุณที่สนใจสมัครเข้าร่วม AssetWise Creator Club',
  html: buildRegistrationPendingEmailHtml(recipient),
});

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatusCode, string> = {
  0: 'ถูกปฏิเสธ',
  1: 'อนุมัติแล้ว',
  2: 'ไม่ใช้งาน',
  3: 'รอการอนุมัติ',
};
