export type Screen =
  | 'home'
  | 'camera'
  | 'analyzing'
  | 'ocr-review'
  | 'patient-info'
  | 'dispensing'
  | 'dispense-confirm'
  | 'audit'
  | 'complete'
  | 'manual-input'
  | 'audit-log'
  | 'settings';

export type PowderUnit = 'g' | 'mg';

export interface PharmacySettings {
  defaultPowderUnit: PowderUnit; // 粉薬デフォルト単位（水薬は常にmL）
  pharmacyName: string;
}

export interface PatientInfo {
  name: string;
  age: string;
  weight: string;
}

export interface OcrMed {
  name: string;
  dose: string;
  frequency: string;
}

export interface PrescriptionData {
  imageDataUrl: string;
  ocrText: string;
  medications: Medication[];
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  status: 'safe' | 'warning' | 'danger';
  notes?: string;
  pmdaLink?: string;
  pmdaUrl?: string;
  interactions?: string[];
  counselingPoints?: string[];
  // 調製計算用フィールド（粉薬・水薬共通）
  dose_amount?: number;            // 1日量（数値）
  dose_unit?: 'mL' | 'g' | 'mg';  // 単位
  concentration_mg_per_g?: number; // 含量 mg/g（mg指定時のみ: 製剤量換算に使用）
  doses_per_day?: number;          // 1日投与回数（分N）
  days_supply?: number;            // 投与日数
  // 水薬専用
  is_liquid?: boolean;
  rp_group?: number;
}

// 調製計算結果（薬剤1つ分）
export interface DispenseCalc {
  name: string;
  doseAmount: number;              // 1日量（入力値）
  doseUnit: 'mL' | 'g' | 'mg';   // 入力単位
  dosesPerDay: number;             // 分N
  daysSupply: number;              // 日数
  rpGroup: number;                 // Rpグループ番号
  // mg入力時の換算
  isMg: boolean;
  concentrationMgPerG?: number;    // 含量 mg/g
  doseAmountG?: number;            // 換算後の製剤量 (g)
  // 秤量（mL/gで）
  totalAmount: number;             // 秤量 = 製剤量(g or mL) × 分N × 日数
  totalUnit: string;               // 秤量の単位（g or mL）
  formulaText: string;             // 計算式文字列
  isLiquid: boolean;
  // 水薬のみ
  bottleSizeMl?: number;
  addedWaterMl?: number;
  doseVolumeMl?: number;
  cupScaleMl?: number;
}

// 同Rpグループの水薬合算結果
export interface RpLiquidSummary {
  rpGroup: number;
  names: string[];                 // 同Rp内の水薬名リスト
  totalDoseMl: number;             // 合算1回量(mL) = 各薬剤の1回量合計
  dosesPerDay: number;             // 分N（同Rp内は同じ想定）
  daysSupply: number;              // 日数（同Rp内は同じ想定）
  totalVolumeMl: number;           // 合算秤量 = 合算1回量 × 分N × 日数
  bottleSizeMl: number;            // 推奨容器サイズ
  cupScaleMl?: number;             // カップ目盛り
}

export interface DrugMaster {
  id: string;
  name: string;
  name_kana: string | null;
  yj_code: string | null;
  pmda_pdf_url: string | null;
  category: string;
  dose_per_kg_min: number | null;
  dose_per_kg_max: number | null;
  dose_unit: string;
  dose_frequency: string | null;
  dose_max_single: number | null;
  dose_notes: string | null;
  age_min_months: number;
  age_max_years: number | null;
  warnings: string | null;
  concentration_mg_per_g: number | null; // 含量 mg/g（mg指定時の製剤量換算用）
  dose_default_unit: 'mL' | 'g' | 'mg' | null; // デフォルト単位
}
