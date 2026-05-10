import type { Medication, DispenseCalc, RpLiquidSummary } from '../types';

const BOTTLE_SIZES = [30, 60, 100, 200, 300];

// 0.5mL 刻みで切り上げ（カップ計量に対応した標準刻み）
function roundUp25(value: number): number {
  return Math.ceil(value * 2) / 2;
}

function fmt(n: number, digits = 3): string {
  return parseFloat(n.toFixed(digits)).toString();
}

function selectBottle(totalMl: number): number {
  for (const size of BOTTLE_SIZES) {
    if (size >= totalMl) return size;
  }
  return BOTTLE_SIZES[BOTTLE_SIZES.length - 1];
}

// カップ上限: 1回量が 10mL 以下なら 10mL, それ以上なら 20mL
function selectCupMax(perDoseMl: number): 10 | 20 {
  return perDoseMl <= 10 ? 10 : 20;
}

// 後方互換用スタブ
export function parseDoseAmount(_doseText: string): { amount: number; unit: string } | null {
  return null;
}
export function parseDoseMl(_doseText: string): number | null {
  return null;
}

// 全薬剤（粉・水共通）の調製計算
// dose_amount は「1日量」
// 水薬の doseVolumeMl / bottleSizeMl は個別ではなく「Rp合算後の値」を後から上書きするため
// ここでは加水なし・仮の個別値のみ設定し、calcRpLiquidSummaries で上書きする
export function calcDispenseCalcs(medications: Medication[]): DispenseCalc[] {
  return medications
    .filter(m => m.dose_amount != null && m.doses_per_day != null && m.days_supply != null)
    .map(m => {
      const unit = m.dose_unit ?? 'g';
      const dailyAmount = m.dose_amount!;    // 1日量（生値）
      const dosesPerDay = m.doses_per_day!;
      const daysSupply = m.days_supply!;
      const rpGroup = m.rp_group ?? 1;

      const isMg = unit === 'mg';
      const isLiquid = unit === 'mL';

      // 1回量 = 1日量 ÷ 分N（参考表示用）
      const perDose = parseFloat((dailyAmount / dosesPerDay).toFixed(4));

      let doseAmountG: number | undefined;
      let totalAmount: number;
      let totalUnit: string;
      let formulaText: string;

      if (isMg) {
        const conc = m.concentration_mg_per_g ?? 0;
        const dailyMg = dailyAmount;
        if (conc > 0) {
          const dailyG = parseFloat((dailyMg / conc).toFixed(4));
          totalAmount = parseFloat((dailyG * daysSupply).toFixed(4));
          totalUnit = 'g';
          doseAmountG = parseFloat((perDose / conc).toFixed(4));
          formulaText =
            `1日量 ${fmt(dailyMg)}mg ÷ ${fmt(conc)}mg/g = 1日製剤量 ${fmt(dailyG, 4)}g\n` +
            `${fmt(dailyG, 4)}g × ${daysSupply}日分 = ${fmt(totalAmount, 4)}g\n` +
            `（1回量 ${fmt(perDose)}mg 参考）`;
        } else {
          totalAmount = parseFloat((dailyMg * daysSupply).toFixed(3));
          totalUnit = 'mg';
          formulaText =
            `1日量 ${fmt(dailyMg)}mg × ${daysSupply}日分 = ${fmt(totalAmount)}mg\n` +
            `（1回量 ${fmt(perDose)}mg 参考）\n※ 含量を入力すると製剤量(g)に換算されます`;
        }
      } else {
        totalAmount = parseFloat((dailyAmount * daysSupply).toFixed(3));
        totalUnit = unit;
        formulaText =
          `1日量 ${fmt(dailyAmount)}${unit} × ${daysSupply}日分 = ${fmt(totalAmount)}${unit}\n` +
          `（1回量 ${fmt(perDose)}${unit} 参考）`;
      }

      // 水薬: 個別の仮値（同Rpが1剤のみの場合に使う）
      let bottleSizeMl: number | undefined;
      let addedWaterMl: number | undefined;
      let doseVolumeMl: number | undefined;
      let cupScaleMl: number | undefined;

      if (isLiquid) {
        // 1日量を 0.5刻み切り上げ → 秤量 = 切り上げ後1日量 × 日数
        const roundedDaily = roundUp25(dailyAmount);
        const finalTotal = parseFloat((roundedDaily * daysSupply).toFixed(2));
        addedWaterMl = parseFloat((finalTotal - totalAmount).toFixed(2));
        if (addedWaterMl < 0) addedWaterMl = 0;
        bottleSizeMl = selectBottle(finalTotal);
        doseVolumeMl = parseFloat((roundedDaily / dosesPerDay).toFixed(4)); // 1回量（参考）
        cupScaleMl = selectCupMax(doseVolumeMl);

        formulaText =
          `1日量 ${fmt(dailyAmount)}mL × ${daysSupply}日分 = ${fmt(totalAmount)}mL\n` +
          `（1回量 ${fmt(perDose)}mL 参考）`;
      }

      return {
        name: m.name,
        doseAmount: dailyAmount,
        doseUnit: unit as 'mL' | 'g' | 'mg',
        dosesPerDay,
        daysSupply,
        rpGroup,
        isMg,
        concentrationMgPerG: isMg ? m.concentration_mg_per_g : undefined,
        doseAmountG,
        totalAmount,
        totalUnit,
        formulaText,
        isLiquid,
        bottleSizeMl,
        addedWaterMl,
        doseVolumeMl,
        cupScaleMl,
      };
    });
}

// 同Rpグループの水薬合算サマリーを計算
// 手順: 各薬剤の1日量を合算 → 0.5刻み切り上げ → 合算1日量 × 日数 = 秤量
export function calcRpLiquidSummaries(calcs: DispenseCalc[]): RpLiquidSummary[] {
  const liquidCalcs = calcs.filter(c => c.isLiquid);
  if (liquidCalcs.length === 0) return [];

  const groups = new Map<number, DispenseCalc[]>();
  for (const c of liquidCalcs) {
    const list = groups.get(c.rpGroup) ?? [];
    list.push(c);
    groups.set(c.rpGroup, list);
  }

  const summaries: RpLiquidSummary[] = [];
  for (const [rpGroup, group] of groups.entries()) {
    if (group.length < 2) continue;

    const dosesPerDay = group[0].dosesPerDay;
    const daysSupply = group[0].daysSupply;

    // 1. 各薬剤の1日量を合算
    const rawTotalDaily = group.reduce((sum, c) => sum + c.doseAmount, 0);

    // 2. 合算1日量を 0.5mL 刻みに切り上げ
    const roundedDaily = roundUp25(rawTotalDaily);

    // 3. 秤量 = 合算1日量 × 日数
    const totalVolumeMl = parseFloat((roundedDaily * daysSupply).toFixed(2));
    const bottleSizeMl = selectBottle(totalVolumeMl);

    // 1回量（参考）= 合算1日量 ÷ 分N
    const perDoseMl = parseFloat((roundedDaily / dosesPerDay).toFixed(4));
    const cupScaleMl = selectCupMax(perDoseMl);

    summaries.push({
      rpGroup,
      names: group.map(c => c.name),
      totalDoseMl: perDoseMl,  // 参考用1回量
      dosesPerDay,
      daysSupply,
      totalVolumeMl,
      bottleSizeMl,
      cupScaleMl,
    });
  }

  return summaries.sort((a, b) => a.rpGroup - b.rpGroup);
}
