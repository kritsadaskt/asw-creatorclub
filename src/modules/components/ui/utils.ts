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
      return 'Mr. & Mrs. Global Thailand';
    case 'pageant':
      return 'Pageant';
  }
  return key;
}