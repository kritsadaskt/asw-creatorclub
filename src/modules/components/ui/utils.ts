import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function CreatorTypeNameByKey(key: string) {
  switch (key) {
    case 'assetwise_staff':
      return 'ASSETWISE';
    case 'asw_household':
      return 'ลูกบ้าน';
    case 'mister_int':
      return 'Mister Inter';
    case 'miss_world_th':
      return 'Miss World Thailand';
    case 'miss_world':
      return 'Miss World';
    case 'miss_th':
      return 'นางสาวไทย';
    case 'mr_mrs_global':
      return 'Mr. & Miss Global Thailand';
    case 'pageant':
      return 'Pageant';
  }
  return key;
}

export function LeadTypeByKey(key: string) {
  switch (key) {
    case 'creator_club_affiliate':
      return 'Affiliate';
    case 'friend_get_friend':
      return 'Friend Get Friends';
    default:
      return 'Affiliate';
  }
}

export function LeadCampaignByKey(key: string) {
  switch (key) {
    case 'creator_club_affiliate':
      return 'Affiliate';
    case 'friend_get_friend':
      return 'Friend Get Friends';
    default:
      return 'Affiliate';
  }
}