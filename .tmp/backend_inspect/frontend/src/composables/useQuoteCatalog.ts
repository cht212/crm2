import type {
  CatalogFinish,
  CatalogLength,
  CatalogProduct,
  CatalogSubtype,
  CatalogThickness,
  CatalogType,
} from "@/types/catalog";

export const getCatalogType = (
  catalog: CatalogType[],
  typeId: number | null,
) => {
  if (!typeId) return null;

  return catalog.find((type) => type.id === typeId) ?? null;
};

export const getCatalogConfiguration = (
  catalog: CatalogType[],
  typeId: number | null,
) => getCatalogType(catalog, typeId)?.configuration ?? null;

export const getCatalogProducts = (
  catalog: CatalogType[],
  typeId: number | null,
  subtypeId: number | null = null,
): CatalogProduct[] => {
  const type = getCatalogType(catalog, typeId);
  if (!type) return [];
  if (subtypeId) {
    return type.subtypes?.find((subtype) => subtype.id === subtypeId)?.products ?? [];
  }

  return type.products ??
    type.subtypes?.flatMap((subtype) => subtype.products) ?? [];
};

export const getCatalogSubtypes = (
  catalog: CatalogType[],
  typeId: number | null,
): CatalogSubtype[] => getCatalogType(catalog, typeId)?.subtypes ?? [];

export const getCatalogSubtype = (
  catalog: CatalogType[],
  typeId: number | null,
  subtypeId: number | null,
) =>
  getCatalogSubtypes(catalog, typeId).find((subtype) => subtype.id === subtypeId) ??
  null;

export const getCatalogLengths = (
  catalog: CatalogType[],
  typeId: number | null,
): CatalogLength[] => getCatalogType(catalog, typeId)?.lengths ?? [];

export const getCatalogFinishes = (
  catalog: CatalogType[],
  typeId: number | null,
): CatalogFinish[] => getCatalogType(catalog, typeId)?.finishes ?? [];

export const getCatalogThicknesses = (
  catalog: CatalogType[],
  typeId: number | null,
): CatalogThickness[] => getCatalogType(catalog, typeId)?.thicknesses ?? [];

export const getCatalogTypeOptions = (catalog: CatalogType[]) =>
  catalog.map((type) => ({
    title: type.name,
    value: type.id,
  }));
