import type { Medication, PatientInfo } from '../types';

// For manual input: convert user-entered drug entries to Medication[]
// Status is set to 'safe' as a placeholder — real dose checking requires a backend
export function buildMedicationsFromInput(
  entries: {
    name: string;
    dose: string;
    frequency: string;
    dose_amount?: number;
    dose_unit?: 'mL' | 'g' | 'mg';
    concentration_mg_per_g?: number;
    doses_per_day?: number;
    days_supply?: number;
    is_liquid?: boolean;
    rp_group?: number;
  }[]
): Medication[] {
  return entries.map(e => ({
    name: e.name,
    dose: e.dose,
    frequency: e.frequency,
    status: 'safe' as const,
    notes: '手入力された薬剤です。PMDA 添付文書で用量を確認してください。',
    dose_amount: e.dose_amount,
    dose_unit: e.dose_unit,
    concentration_mg_per_g: e.concentration_mg_per_g,
    doses_per_day: e.doses_per_day,
    days_supply: e.days_supply,
    is_liquid: e.is_liquid,
    rp_group: e.rp_group,
  }));
}

// Simulated OCR + pediatric dose check (used for camera flow only)
export function analyzePrescription(_imageDataUrl: string, patient: PatientInfo): Medication[] {
  const age = Number(patient.age);
  const weight = Number(patient.weight);

  const base: Medication[] = [
    {
      name: 'アモキシシリン顆粒',
      dose: `${Math.round(weight * 25)}mg (25mg/kg/日)`,
      frequency: '1日3回 食後',
      status: 'safe',
      notes: `小児用量：25〜50mg/kg/日（分3）。${patient.name}さん（${weight}kg）の処方量は適切な範囲内です。`,
    },
    {
      name: 'アセトアミノフェン細粒',
      dose: `${Math.round(weight * 10)}mg (10mg/kg/回)`,
      frequency: '発熱時 頓服',
      status: age < 3 ? 'warning' : 'safe',
      notes:
        age < 3
          ? `3歳未満では投与間隔を6時間以上確保してください。体重${weight}kgに対する用量は適切ですが、投与頻度に注意が必要です。`
          : `小児用量：10〜15mg/kg/回（最大60mg/kg/日）。適切な用量です。`,
    },
    {
      name: 'カルボシステインシロップ',
      dose: `${Math.round(weight * 15)}mg (15mg/kg/日)`,
      frequency: '1日3回 食後',
      status: 'safe',
      notes: `去痰薬。小児標準用量（30mg/kg/日分3）の範囲内。問題ありません。`,
    },
  ];

  if (age < 2) {
    base.push({
      name: 'クラリスロマイシン',
      dose: `${Math.round(weight * 10)}mg`,
      frequency: '1日2回',
      status: 'danger',
      notes:
        '2歳未満への投与は慎重投与が必要です。QT延長リスクがあるため、他の抗菌薬への変更を検討してください。処方医に確認を推奨します。',
    });
  }

  return base;
}
