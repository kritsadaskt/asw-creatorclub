export type CreatorCategoryOption = { value: string; label: string };

export const CREATOR_CATEGORIES: CreatorCategoryOption[] = [
  { value: 'lifestyle', label: 'Lifestyle - ไลฟส์สไตล์ / การใช้ชีวิต' },
  { value: 'food', label: 'Food - อาหาร' },
  { value: 'travel', label: 'Travel - ท่องเที่ยว' },
  { value: 'beauty', label: 'Beauty - ความงาม' },
  { value: 'fashion', label: 'Fashion - แฟชั่น' },
  { value: 'entertainment', label: 'Entertainment - ความบันเทิง' },
  { value: 'sports', label: 'Sports - กีฬา' },
  { value: 'music', label: 'Music - เพลง' },
  { value: 'art', label: 'Art - ศิลปะ' },
  { value: 'gaming', label: 'Gaming - เกม' },
  { value: 'fitness', label: 'Fitness - การออกกำลังกาย' },
  { value: 'family', label: 'Family - ครอบครัว' },
  { value: 'technology', label: 'Technology - เทคโนโลยี' },
  { value: 'health', label: 'Health - สุขภาพ' },
  { value: 'education', label: 'Education - การศึกษา' },
  { value: 'news', label: 'News - ข่าว' },
  { value: 'pet', label: 'Pet - สัตว์เลี้ยง' },
  { value: 'science', label: 'Science - วิทยาศาสตร์' },
  { value: 'design', label: 'Design - การออกแบบ' },
  { value: 'architecture', label: 'Architecture - การออกแบบ' },
  { value: 'other', label: 'Other - อื่นๆ' },
];

const MAX_INVITE_TYPE_LENGTH = 200;

/** Single `type` query value: any non-empty string for invite grouping (stored in profile `categories`). */
export function parseInviteTypeParam(param: string | null): string[] | null {
  if (param == null) return null;
  const raw = param.trim();
  if (!raw) return null;
  if (raw.length > MAX_INVITE_TYPE_LENGTH) return null;
  return [raw];
}
