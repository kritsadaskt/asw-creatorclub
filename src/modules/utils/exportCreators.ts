import type { CreatorProfile, CreatorTypeRow } from '../types';
import { resolveCreatorTypeThLabel } from './creatorTypeLookup';

// Lazy-load xlsx only in the browser
export async function exportCreatorsToXlsx(
  creators: CreatorProfile[],
  creatorTypes?: Pick<CreatorTypeRow, 'key' | 'nameTh' | 'nameEn'>[],
) {
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
    'ประเภท':
      creatorTypes && creatorTypes.length > 0
        ? resolveCreatorTypeThLabel(creator.type, creatorTypes)
        : creator.type === 'asw_household' || creator.type === 'asw_houshold'
          ? 'ลูกบ้านแอสเซทไวส์'
          : creator.type === 'assetwise_staff' || creator.type === 'asw_staff'
            ? 'พนักงาน Assetwise'
            : 'บุคคลทั่วไป',
    'วันที่ลงทะเบียน': creator.createdAt,
  }));

  const worksheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Creators');

  writeFile(workbook, `${new Date().toISOString().split('T')[0]}_exported_asw-creatorclub_creators.xlsx`);
}

