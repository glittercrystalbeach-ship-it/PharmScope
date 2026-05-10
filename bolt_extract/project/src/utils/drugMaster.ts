import { supabase } from '../lib/supabase';
import type { DrugMaster, Medication, OcrMed, PatientInfo } from '../types';

// In-memory cache: populated once per session
let cache: DrugMaster[] | null = null;

export async function loadDrugMaster(): Promise<DrugMaster[]> {
  if (cache) return cache;
  const { data, error } = await supabase.from('drug_master').select('*').order('name');
  if (error || !data) return [];
  cache = data as DrugMaster[];
  return cache;
}

// ひらがな → カタカナ変換
function toKatakana(s: string): string {
  return s.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

// Normalize strings for fuzzy matching (strip spaces, NFKC, ひらがな→カタカナ統一)
// ひらがな・カタカナのどちらで入力しても同じ結果になるよう両者をカタカナに統一する
function normalize(s: string): string {
  const nfkc = s.toLowerCase().replace(/[\s　]/g, '').normalize('NFKC');
  return toKatakana(nfkc);
}

function normalizeQuery(q: string): string {
  return normalize(q);
}

// 剤形フィルタ: 錠剤・カプセル・点眼薬は予測変換対象外
const EXCLUDED_FORMS = /錠|カプセル|cap|tab|OD錠|chewable|点眼|点鼻|点耳|eye drop|ophthalmic/i;
const INCLUDED_FORMS = /散|顆粒|細粒|ドライシロップ|DS|シロップ|内用液|液/i;

function isSearchableDrug(drug: DrugMaster): boolean {
  // 含まれるべき剤形ワードがある → OK
  if (INCLUDED_FORMS.test(drug.name)) return true;
  // 除外剤形ワードがある → NG
  if (EXCLUDED_FORMS.test(drug.name)) return false;
  // どちらでもない（剤形名なし）→ OK（散剤として扱う）
  return true;
}

// 予測変換: 入力テキストに部分一致する薬剤を最大8件返す（前方一致優先、錠剤・カプセル除外）
export function searchDrugMaster(query: string, master: DrugMaster[]): DrugMaster[] {
  const q = normalizeQuery(query);
  if (q.length < 1) return [];

  const startsWith: DrugMaster[] = [];
  const contains: DrugMaster[] = [];

  for (const d of master) {
    if (!isSearchableDrug(d)) continue;
    const dn = normalize(d.name);
    const dk = d.name_kana ? normalize(d.name_kana) : '';
    if (dn.startsWith(q) || dk.startsWith(q)) {
      startsWith.push(d);
    } else if (dn.includes(q) || dk.includes(q)) {
      contains.push(d);
    }
  }

  return [...startsWith, ...contains].slice(0, 8);
}

export function matchDrug(name: string, master: DrugMaster[]): DrugMaster | null {
  const q = normalize(name);
  if (!q) return null;
  // Exact match first
  const exact = master.find(d => normalize(d.name) === q);
  if (exact) return exact;
  // Partial: drug name contains query OR query contains drug name
  return master.find(d => {
    const dn = normalize(d.name);
    return dn.includes(q) || q.includes(dn.substring(0, Math.max(4, dn.length - 4)));
  }) ?? null;
}

function pmdaUrl(drug: DrugMaster): string {
  // Direct PDF URL takes highest priority
  if (drug.pmda_pdf_url) return drug.pmda_pdf_url;
  // YJ code → PMDA detail page (iyakuDetail)
  if (drug.yj_code) {
    return `https://www.pmda.go.jp/PmdaSearch/iyakuDetail/GeneralList/${drug.yj_code}`;
  }
  // Fallback: name search
  return `https://www.pmda.go.jp/PmdaSearch/iyakuSearch/?name=${encodeURIComponent(drug.name.replace(/[\s　]+/g, ''))}&language=ja`;
}

function calcDoseStatus(
  drug: DrugMaster,
  prescribedDoseStr: string,
  weightKg: number,
  ageMonths: number,
): { status: Medication['status']; notes: string } {
  const lines: string[] = [];
  let status: Medication['status'] = 'safe';

  // Age check
  if (ageMonths < drug.age_min_months) {
    status = 'danger';
    lines.push(`${drug.age_min_months}ヶ月未満への投与は適応外です（現在${ageMonths}ヶ月）。`);
  }
  if (drug.age_max_years != null && ageMonths > drug.age_max_years * 12) {
    if (status === 'safe') status = 'warning';
    lines.push(`${drug.age_max_years}歳超への投与は適応外の可能性があります。`);
  }

  // Warnings text
  if (drug.warnings) {
    const warnLower = drug.warnings.toLowerCase();
    // Check if current age is under caution threshold (look for "X歳未満" or "Xヶ月未満" in warnings)
    const monthMatch = drug.warnings.match(/(\d+)ヶ月未満.*慎重/);
    const yearMatch = drug.warnings.match(/(\d+)歳未満.*慎重/);
    if (monthMatch && ageMonths < Number(monthMatch[1])) {
      if (status === 'safe') status = 'warning';
      lines.push(`注意: ${drug.warnings}`);
    } else if (yearMatch && ageMonths < Number(yearMatch[1]) * 12) {
      if (status === 'safe') status = 'warning';
      lines.push(`注意: ${drug.warnings}`);
    } else if (warnLower.includes('禁忌') || warnLower.includes('禁止')) {
      if (status === 'safe') status = 'warning';
      lines.push(`警告: ${drug.warnings}`);
    }
  }

  // Dose range check (only if we can parse a numeric value)
  if (drug.dose_per_kg_min != null && drug.dose_per_kg_max != null && weightKg > 0) {
    const numMatch = prescribedDoseStr.match(/([\d.]+)/);
    if (numMatch) {
      const prescribed = parseFloat(numMatch[1]);
      const unit = drug.dose_unit ?? '';

      let prescribed_per_kg_per_day = prescribed;
      // Normalize: if unit is "mg/kg/回" multiply by assumed divided_doses
      if (unit.includes('/回') || unit.includes('/dose')) {
        // single dose — compare directly with dose_per_kg_min/max (also per dose)
      } else {
        // daily dose — divide by weight to get per kg
        prescribed_per_kg_per_day = prescribed / weightKg;
      }

      const minDose = drug.dose_per_kg_min * weightKg;
      const maxDose = drug.dose_per_kg_max * weightKg;
      const minLabel = `${drug.dose_per_kg_min}${unit.replace('mg/kg', '')}`;
      const maxLabel = `${drug.dose_per_kg_max}${unit.replace('mg/kg', '')}`;

      if (prescribed < minDose * 0.8) {
        if (status === 'safe') status = 'warning';
        lines.push(`処方量(${prescribed}mg)が推奨範囲(${minDose.toFixed(0)}〜${maxDose.toFixed(0)}mg)を下回っています（${minLabel}〜${maxLabel}/kg）。`);
      } else if (prescribed > maxDose * 1.1) {
        status = 'danger';
        lines.push(`処方量(${prescribed}mg)が推奨範囲(${maxDose.toFixed(0)}mg)を超えています！確認が必要です。`);
      } else {
        lines.push(`用量(${prescribed}mg)は適切な範囲内です（推奨: ${minDose.toFixed(0)}〜${maxDose.toFixed(0)}mg）。`);
      }
    }
  }

  // Max single dose check
  if (drug.dose_max_single != null) {
    const numMatch = prescribedDoseStr.match(/([\d.]+)/);
    if (numMatch) {
      const prescribed = parseFloat(numMatch[1]);
      if (prescribed > drug.dose_max_single) {
        status = 'danger';
        lines.push(`1回量(${prescribed}mg)が最大量(${drug.dose_max_single}mg)を超えています！`);
      }
    }
  }

  if (drug.dose_notes) lines.push(drug.dose_notes);
  if (lines.length === 0) lines.push(`PMDAで添付文書をご確認ください。`);

  return { status, notes: lines.join(' ') };
}

export async function buildMedsWithMaster(
  ocrMeds: OcrMed[],
  patient: PatientInfo,
): Promise<Medication[]> {
  if (ocrMeds.length === 0) {
    return [{ name: '薬剤情報なし', dose: '—', frequency: '—', status: 'warning', notes: '薬剤情報が確認できませんでした。' }];
  }

  const master = await loadDrugMaster();
  const ageMonths = Math.round(Number(patient.age) * 12);
  const weightKg = Number(patient.weight);

  return ocrMeds.map((m): Medication => {
    const drug = matchDrug(m.name, master);
    if (!drug) {
      return {
        name: m.name, dose: m.dose, frequency: m.frequency,
        status: 'safe',
        notes: 'マスタ未登録薬剤。PMDAで添付文書を確認してください。',
        pmdaUrl: `https://www.pmda.go.jp/PmdaSearch/iyakuSearch/?name=${encodeURIComponent(m.name.replace(/[\s　]+/g, ''))}&language=ja`,
      };
    }

    const { status, notes } = calcDoseStatus(drug, m.dose, weightKg, ageMonths);
    return {
      name: m.name, dose: m.dose, frequency: m.frequency,
      status, notes,
      pmdaUrl: pmdaUrl(drug),
    };
  });
}
