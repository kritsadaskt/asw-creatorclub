import type { CreatorProfile } from '../types';

// Lazy-load xlsx only in the browser
export async function exportCreatorsToXlsx(creators: CreatorProfile[]) {
  if (creators.length === 0) return;

  const { utils, writeFile } = await import('xlsx');

  const rows = creators.map((creator) => ({
    'ชื่อ': creator.name,
    'นามสกุล': creator.lastName ?? '',
    'อีเมล': creator.email,
    'โทรศัพท์': creator.phone,
    'พื้นที่': creator.baseLocation,
    'จังหวัด': creator.province ?? '',
    'หมวดหมู่': creator.categories.join(', '),
    'Facebook': creator.socialAccounts.facebook ?? '',
    'Instagram': creator.socialAccounts.instagram ?? '',
    'TikTok': creator.socialAccounts.tiktok ?? '',
    'YouTube': creator.socialAccounts.youtube ?? '',
    'Twitter': creator.socialAccounts.twitter ?? '',
    'Lemon8': creator.socialAccounts.lemon8 ?? '',
    'สถานะ': 'อนุมัติแล้ว',
    'วันที่ลงทะเบียน': creator.createdAt,
  }));

  const worksheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Creators');

  writeFile(workbook, 'creators-approved.xlsx');
}

