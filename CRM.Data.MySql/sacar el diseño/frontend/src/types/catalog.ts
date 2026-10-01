export interface CatalogConfiguration {
  uses_finish: boolean;
  uses_lengths: boolean | number;
  uses_thickness: boolean;
  uses_dimensions: boolean;
}

export interface CatalogProduct {
  id: number;
  name: string;
  code?: string;
  subtype_id?: number;
  max_quantity?: number;
  is_active?: boolean;
}

export interface CatalogSubtype {
  id: number;
  type_id: number;
  name: string;
  products?: CatalogProduct[];
  is_active?: boolean;
}

export interface CatalogLength {
  id: number;
  code: string;
  value: string;
  is_active?: boolean;
}

export interface CatalogFinish {
  id: number;
  name: string;
  apply_measure_validation: boolean;
  max_width: number | null;
  max_height: number | null;
  is_active?: boolean;
}

export interface CatalogType {
  id: number;
  name: string;
  configuration: CatalogConfiguration | null;
  products: CatalogProduct[];
  subtypes?: CatalogSubtype[];
  lengths: CatalogLength[];
  finishes: CatalogFinish[];
  characteristics: CatalogCharacteristic[];
  is_active?: boolean;
}

export interface CatalogCharacteristic {
  id: number;
  name: string;
}
