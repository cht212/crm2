import {
  getCatalogConfiguration,
  getCatalogFinishes,
  getCatalogLengths,
  getCatalogProducts,
  getCatalogSubtypes,
  getCatalogType,
} from "@/composables/useQuoteCatalog";
import { getQuoteConfigurations } from "@/services/catalogService";
import type {
  CatalogFinish,
  CatalogLength,
  CatalogProduct,
  CatalogType,
} from "@/types/catalog";
import { ref } from "vue";

export interface QuoteRequestDetail {
  id: number;
  product_type_id: number | null;
  subtype_id: number | null;
  product_id: number | null;
  lengths_id: number | null;
  finish_id: number | null;
  thickness: number | null;
  base: number | null;
  height: number | null;
  quantity: number;
  observation: string | null;
  product_type?: Pick<CatalogType, "id" | "name"> | null;
  product?: CatalogProduct | null;
  length?: CatalogLength | null;
  finish?: Pick<CatalogFinish, "id" | "name"> | null;
  characteristics: number[];
}

export type QuoteRequestDetailDraft = Omit<
  QuoteRequestDetail,
  "id" | "product_type" | "product" | "length" | "finish"
>;

export type SaveQuoteRequestDetailResult =
  | "added"
  | "updated"
  | "merged"
  | "quantity-limit";

export type QuoteRequestDetailValidationErrors = Record<
  number,
  Partial<Record<keyof QuoteRequestDetail, string>>
>;

let catalogCache: CatalogType[] | null = null;
let catalogRequest: Promise<CatalogType[]> | null = null;

const createEmptyDetail = (id: number): QuoteRequestDetail => ({
  id,
  product_type_id: null,
  subtype_id: null,
  product_id: null,
  lengths_id: null,
  finish_id: null,
  thickness: null,
  base: null,
  height: null,
  quantity: 1,
  observation: null,
  characteristics: [],
});

export const useQuoteRequest = () => {
  const catalog = ref<CatalogType[]>([]);

  const details = ref<QuoteRequestDetail[]>([createEmptyDetail(1)]);

  const loadingCatalog = ref(false);
  const saving = ref(false);
  const errorMessage = ref("");

  // =========================================================
  // CARGAR CATÁLOGO
  // =========================================================

  const loadCatalog = async (refresh = false): Promise<boolean> => {
    loadingCatalog.value = true;
    errorMessage.value = "";

    try {
      if (catalogCache && !refresh) {
        catalog.value = catalogCache;

        return true;
      }

      if (!catalogRequest) {
        catalogRequest = getQuoteConfigurations().finally(() => {
          catalogRequest = null;
        });
      }

      catalogCache = await catalogRequest;
      catalog.value = catalogCache;
      return true;
    } catch (error) {
      console.error(error);
      errorMessage.value = "No se pudieron cargar los catálogos.";
      return false;
    } finally {
      loadingCatalog.value = false;
    }
  };

  const getConfiguration = (typeId: number | null) =>
    typeId ? getCatalogConfiguration(catalog.value, typeId) : null;

  const getType = (typeId: number | null) =>
    typeId ? getCatalogType(catalog.value, typeId) : null;

  const getProducts = (typeId: number | null) =>
    typeId ? getCatalogProducts(catalog.value, typeId) : [];

  const getSubtypes = (typeId: number | null) =>
    typeId ? getCatalogSubtypes(catalog.value, typeId) : [];

  const getLengths = (typeId: number | null) =>
    typeId ? getCatalogLengths(catalog.value, typeId) : [];

  const getFinishes = (typeId: number | null) =>
    typeId ? getCatalogFinishes(catalog.value, typeId) : [];

  const updateType = (detail: QuoteRequestDetail, typeId: number | null) => {
    delete validationErrors.value[detail.id];
    detail.product_type_id = typeId;

    detail.subtype_id = null;
    detail.product_id = null;
    detail.lengths_id = null;
    detail.finish_id = null;
    detail.thickness = null;
    detail.base = null;
    detail.height = null;
    detail.characteristics = [];
  };

const updateField = (
    detail: QuoteRequestDetail,
    field: keyof QuoteRequestDetail,
    value: unknown,
  ) => {
    delete validationErrors.value[detail.id];

    if (field === "base" || field === "height") {
      detail[field] = sanitizeNumber(value, false) as never;
    } else if (field === "thickness") {
      detail[field] = sanitizeNumber(value, true) as never;
    } else if (field === "quantity") {
      detail[field] = Math.max(1, sanitizeNumber(value, false) ?? 1) as never;
    } else if (field === "characteristics") {
      detail[field] = (value as number[]) as never;
    } else {
      detail[field] = value as never;
    }

    if (field === "product_id") {
      detail.lengths_id = null;
      detail.finish_id = null;
      detail.thickness = null;
    }

    if (field === "lengths_id") {
      detail.finish_id = null;
    }

  };

  const addDetail = (targetDetails = details.value) => {
    const nextId = targetDetails.length
      ? Math.min(...targetDetails.map((detail) => detail.id), 0) - 1
      : -1;

    targetDetails.push(createEmptyDetail(nextId));
  };

  const removeDetail = (id: number, targetDetails = details.value) => {
    delete validationErrors.value[id];

    const index = targetDetails.findIndex((detail) => detail.id === id);

    if (index !== -1) targetDetails.splice(index, 1);
  };

  const normalizeComparableNumber = (value: number | null) =>
    value === null ? null : Number(value);

  const hasSameConfiguration = (
    detail: QuoteRequestDetail,
    draft: QuoteRequestDetailDraft,
  ) => {
    const detailCharacteristics = [...detail.characteristics]
      .map(Number)
      .sort((a, b) => a - b);
    const draftCharacteristics = [...draft.characteristics]
      .map(Number)
      .sort((a, b) => a - b);
    const sameCharacteristics =
      detailCharacteristics.length === draftCharacteristics.length &&
      detailCharacteristics.every(
        (characteristicId, index) =>
          characteristicId === draftCharacteristics[index],
      );

    return (
      detail.product_type_id === draft.product_type_id &&
      detail.subtype_id === draft.subtype_id &&
      detail.product_id === draft.product_id &&
      detail.lengths_id === draft.lengths_id &&
      detail.finish_id === draft.finish_id &&
      normalizeComparableNumber(detail.thickness) ===
        normalizeComparableNumber(draft.thickness) &&
      normalizeComparableNumber(detail.base) ===
        normalizeComparableNumber(draft.base) &&
      normalizeComparableNumber(detail.height) ===
        normalizeComparableNumber(draft.height) &&
      (detail.observation ?? "").trim() === (draft.observation ?? "").trim() &&
      sameCharacteristics
    );
  };

  const saveDetail = (
    draft: QuoteRequestDetailDraft,
    detailId: number | null,
    targetDetails = details.value,
  ): SaveQuoteRequestDetailResult => {
    const currentDetail =
      detailId === null
        ? null
        : targetDetails.find((detail) => detail.id === detailId) ?? null;
    const matchingDetail = targetDetails.find(
      (detail) =>
        detail.id !== detailId &&
        detail.product_id !== null &&
        hasSameConfiguration(detail, draft),
    );

    if (matchingDetail) {
      const maxQuantity = getProducts(draft.product_type_id).find(
        (product) => product.id === draft.product_id,
      )?.max_quantity;
      const combinedQuantity = matchingDetail.quantity + draft.quantity;

      if (
        typeof maxQuantity === "number" &&
        combinedQuantity > maxQuantity
      ) {
        return "quantity-limit";
      }

      matchingDetail.quantity = combinedQuantity;

      if (currentDetail) removeDetail(currentDetail.id, targetDetails);

      return "merged";
    }

    let detail: QuoteRequestDetail | undefined = currentDetail ?? undefined;

    if (!detail) {
      detail = targetDetails.find(
        (item) => !item.product_type_id && !item.product_id,
      );

      if (!detail) {
        addDetail(targetDetails);
        detail = targetDetails.at(-1);
      }
    }

    if (!detail) {
      throw new Error("No se pudo preparar el producto para guardar.");
    }

    updateType(detail, draft.product_type_id);
    updateField(detail, "subtype_id", draft.subtype_id);
    updateField(detail, "product_id", draft.product_id);
    updateField(detail, "lengths_id", draft.lengths_id);
    updateField(detail, "finish_id", draft.finish_id);
    updateField(detail, "thickness", draft.thickness);
    updateField(detail, "base", draft.base);
    updateField(detail, "height", draft.height);
    updateField(detail, "quantity", draft.quantity);
    updateField(detail, "observation", draft.observation);
    updateField(detail, "characteristics", [...draft.characteristics]);

    return currentDetail ? "updated" : "added";
  };

  const sanitizeNumber = (value: unknown, allowDecimal = true) => {
    if (value === null || value === undefined) return null;

    let text = String(value);

    if (allowDecimal) {
      text = text.replace(",", ".");
      text = text.replace(/[^0-9.]/g, "");

      const parts = text.split(".");

      if (parts.length > 2) {
        text = `${parts[0]}.${parts.slice(1).join("")}`;
      }
    } else {
      text = text.replace(/\D/g, "");
    }

    if (text === "") return null;

    const number = Number(text);

    if (!Number.isFinite(number)) return null;

    return Math.max(0, number);
  };

  const validateDimensions = (
    detail: QuoteRequestDetail,
  ): Partial<Record<keyof QuoteRequestDetail, string>> => {
    const configuration = getConfiguration(detail.product_type_id);

    if (!configuration?.uses_dimensions) return {};

    const errors: Partial<Record<keyof QuoteRequestDetail, string>> = {};

    if (!detail.base || detail.base <= 0)
      errors.base = "La base debe ser mayor a 0.";

    if (!detail.height || detail.height <= 0)
      errors.height = "La altura debe ser mayor a 0.";

    const finish = getCatalogFinishes(
      catalog.value,
      detail.product_type_id,
    ).find((item) => item.id === detail.finish_id);

    if (!finish?.apply_measure_validation) return errors;

    if (
      finish.max_width !== null &&
      detail.base !== null &&
      detail.base > finish.max_width
    ) {
      errors.base = `La base no puede superar ${finish.max_width}.`;
    }

    if (
      finish.max_height !== null &&
      detail.height !== null &&
      detail.height > finish.max_height
    ) {
      errors.height = `La altura no puede superar ${finish.max_height}.`;
    }

    return errors;
  };

  const validationErrors = ref<QuoteRequestDetailValidationErrors>({});

  const validateDetails = (
    targetDetails = details.value,
  ): QuoteRequestDetailValidationErrors => {
    const errors: QuoteRequestDetailValidationErrors = {};

    for (const detail of targetDetails) {
      const configuration = getConfiguration(detail.product_type_id);
      const detailErrors: Partial<Record<keyof QuoteRequestDetail, string>> = {};

      if (!detail.product_type_id)
        detailErrors.product_type_id = "Debe seleccionar el tipo de producto.";

      if (!detail.product_id)
        detailErrors.product_id = "Debe seleccionar el producto.";

      if (configuration?.uses_lengths && !detail.lengths_id)
        detailErrors.lengths_id = "Debe seleccionar la longitud.";

      if (configuration?.uses_finish && !detail.finish_id)
        detailErrors.finish_id = "Debe seleccionar el acabado.";

      if (
        configuration?.uses_thickness &&
        (!detail.thickness || detail.thickness <= 0)
      )
        detailErrors.thickness = "Debe ingresar un espesor mayor a 0.";

      if (!detail.quantity || detail.quantity < 1)
        detailErrors.quantity = "La cantidad debe ser mayor a 0.";

      const product = getProducts(detail.product_type_id).find(
        (item) => item.id === detail.product_id,
      );

      if (
        product &&
        typeof product.max_quantity === "number" &&
        detail.quantity > product.max_quantity
      ) {
        detailErrors.quantity = `La cantidad máxima permitida para este producto es ${product.max_quantity}.`;
      }

      Object.assign(detailErrors, validateDimensions(detail));

      if (Object.keys(detailErrors).length > 0)
        errors[detail.id] = detailErrors;
    }

    return errors;
  };

  const validate = (targetDetails = details.value): boolean => {
    errorMessage.value = "";
    validationErrors.value = validateDetails(targetDetails);

    if (Object.keys(validationErrors.value).length > 0) {
      const firstDetail = Object.values(validationErrors.value)[0];
      errorMessage.value = Object.values(firstDetail)[0] ?? "";
      return false;
    }

    return true;
  };

  return {
    catalog,
    details,
    loadingCatalog,
    saving,
    errorMessage,
    validationErrors,
    loadCatalog,
    getType,
    getConfiguration,
    getSubtypes,
    getProducts,
    getLengths,
    getFinishes,
    updateType,
    updateField,
    addDetail,
    saveDetail,
    removeDetail,
    validate,
  };
};
