import { $api } from "@/utils/api";

export interface LocationProvince {
  code: string;
  name: string;
  districts: LocationDistrict[];
}

export interface LocationDistrict {
  code: string;
  name: string;
}

export interface LocationDepartment {
  code: string;
  name: string;
  provinces: LocationProvince[];
}

export const getUbigeoCode = (
  department: LocationDepartment | undefined,
  provinceName: string,
  districtName: string,
) => {
  const province = department?.provinces.find(item => item.name === provinceName);
  const district = province?.districts.find(item => item.name === districtName);

  return district?.code ?? "";
};

export const locationService = {
  async getLocations() {
    return await $api<{ locations: LocationDepartment[] }>("locations");
  },
};
