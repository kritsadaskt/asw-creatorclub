import provincesData from './provinces.json';
import districtsData from './districts.json';
import subDistrictsData from './sub_districts.json';

export type ThaiProvince = {
  id: number;
  name_th: string;
  name_en: string;
  geography_id: number;
};

export type ThaiDistrict = {
  id: number;
  name_th: string;
  name_en: string;
  province_id: number;
};

export type ThaiSubDistrict = {
  id: number;
  zip_code: number;
  name_th: string;
  name_en: string;
  district_id: number;
};

export type ThaiAddressOption = { value: string; label: string; id: number };

const provinces = provincesData as ThaiProvince[];
const districts = districtsData as ThaiDistrict[];
const subDistricts = subDistrictsData as ThaiSubDistrict[];

export function getProvinceOptions(): ThaiAddressOption[] {
  return provinces.map((p) => ({
    id: p.id,
    value: p.name_th,
    label: p.name_th,
  }));
}

export function findProvinceByNameTh(nameTh: string | undefined | null): ThaiProvince | undefined {
  if (!nameTh) return undefined;
  return provinces.find((p) => p.name_th === nameTh);
}

export function getDistrictOptionsByProvinceId(provinceId: number): ThaiAddressOption[] {
  return districts
    .filter((d) => d.province_id === provinceId)
    .map((d) => ({
      id: d.id,
      value: d.name_th,
      label: d.name_th,
    }));
}

export function findDistrictByNameTh(
  nameTh: string | undefined | null,
  provinceId?: number,
): ThaiDistrict | undefined {
  if (!nameTh) return undefined;
  return districts.find(
    (d) => d.name_th === nameTh && (provinceId == null || d.province_id === provinceId),
  );
}

export function getSubDistrictOptionsByDistrictId(districtId: number): ThaiAddressOption[] {
  return subDistricts
    .filter((s) => s.district_id === districtId)
    .map((s) => ({
      id: s.id,
      value: s.name_th,
      label: s.name_th,
    }));
}

export function findSubDistrictByNameTh(
  nameTh: string | undefined | null,
  districtId?: number,
): ThaiSubDistrict | undefined {
  if (!nameTh) return undefined;
  return subDistricts.find(
    (s) => s.name_th === nameTh && (districtId == null || s.district_id === districtId),
  );
}

export function getPostalCodeForSubDistrict(
  nameTh: string | undefined | null,
  districtId?: number,
): string | undefined {
  const sub = findSubDistrictByNameTh(nameTh, districtId);
  if (!sub?.zip_code) return undefined;
  return String(sub.zip_code);
}
