import type {
  CatalogFinish,
  CatalogLength,
  CatalogProduct,
  CatalogSubtype,
  CatalogType,
} from "@/types/catalog";

const isActive = (item: { is_active?: boolean }) => item.is_active !== false;

export const getCatalogType = (
  catalog: CatalogType[],
  typeId: number | null,
) => {
  if (!typeId) return null;

  return catalog.find((type) => type.id === typeId && isActive(type)) ?? null;
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
    return (
      getCatalogSubtypes(catalog, typeId)
        .find((subtype) => subtype.id === subtypeId)
        ?.products?.filter(isActive) ?? []
    );
  }

  return (
    type.products?.filter(isActive) ??
    getCatalogSubtypes(catalog, typeId).flatMap((subtype) =>
      subtype.products?.filter(isActive) ?? [],
    )
  );
};

export const getCatalogSubtypes = (
  catalog: CatalogType[],
  typeId: number | null,
): CatalogSubtype[] =>
  getCatalogType(catalog, typeId)?.subtypes?.filter(isActive) ?? [];

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
): CatalogLength[] =>
  getCatalogType(catalog, typeId)?.lengths.filter(isActive) ?? [];

export const getCatalogFinishes = (
  catalog: CatalogType[],
  typeId: number | null,
): CatalogFinish[] =>
  getCatalogType(catalog, typeId)?.finishes.filter(isActive) ?? [];

export const getCatalogTypeOptions = (catalog: CatalogType[]) =>
  catalog.filter(isActive).map((type) => ({
    title: type.name,
    value: type.id,
  }));
