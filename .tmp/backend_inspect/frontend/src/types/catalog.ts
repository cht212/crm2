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
}

export interface CatalogSubtype {
  id: number;
  type_id: number;
  name: string;
  products?: CatalogProduct[];
}

export interface CatalogLength {
  id: number;
  code: string;
  value: string;
}

export interface CatalogFinish {
  id: number;
  name: string;
  apply_measure_validation: boolean;
  max_width: number | null;
  max_height: number | null;
}

export interface CatalogThickness {
  id: number;
  value: string;
  unit: string;
  description: string | null;
}

export interface CatalogType {
  id: number;
  name: string;
  configuration: CatalogConfiguration | null;
  products: CatalogProduct[];
  subtypes?: CatalogSubtype[];
  lengths: CatalogLength[];
  finishes: CatalogFinish[];
  thicknesses: CatalogThickness[];
  characteristics: CatalogCharacteristic[];
}

export interface CatalogCharacteristic {
  id: number;
  name: string;
}
