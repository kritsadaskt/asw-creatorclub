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
    'Facebook Followers': creator.followerCounts.facebook ?? '',
    'Instagram': creator.socialAccounts.instagram ?? '',
    'Instagram Followers': creator.followerCounts.instagram ?? '',
    'TikTok': creator.socialAccounts.tiktok ?? '',
    'TikTok Followers': creator.followerCounts.tiktok ?? '',
    'YouTube': creator.socialAccounts.youtube ?? '',
    'YouTube Followers': creator.followerCounts.youtube ?? '',
    'Twitter': creator.socialAccounts.twitter ?? '',
    'Twitter Followers': creator.followerCounts.twitter ?? '',
    'Lemon8': creator.socialAccounts.lemon8 ?? '',
    'Lemon8 Followers': creator.followerCounts.lemon8 ?? '',
    'ประเภท': creator.type === 'asw_household' ? 'ลูกบ้านแอสเซทไวส์' : creator.type === 'assetwise_staff' ? 'พนักงาน Assetwise' : 'บุคคลทั่วไป',
    'วันที่ลงทะเบียน': creator.createdAt,
  }));

  const worksheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Creators');

  writeFile(workbook, `${new Date().toISOString().split('T')[0]}_exported_asw-creatorclub_creators.xlsx`);
}

