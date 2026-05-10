import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Plus, ChevronRight, Trash2, Minus, Droplets, FlaskConical, CheckCircle2 } from 'lucide-react';
import { toHalfWidth } from '../utils/normalize';
import type { PatientInfo, Medication, DrugMaster } from '../types';
import { buildMedicationsFromInput } from '../utils/mockAnalysis';
import { loadDrugMaster, searchDrugMaster } from '../utils/drugMaster';

type DoseUnit = 'mL' | 'g' | 'mg';

interface DrugEntry {
  name: string;
  dose_value: string;
  dose_unit: DoseUnit;
  concentration_mg_per_g: number | null;
  frequency: string;
  doses_per_day: string;
  days_supply: string;
  masterId: string | null;
  rp_group: number; // Rpグループ番号（1始まり）
}

interface Props {
  onResult: (patient: PatientInfo, meds: Medication[]) => void;
  onBack: () => void;
  defaultPowderUnit?: 'g' | 'mg'; // 薬局設定から受け取るデフォルト単位
}

const FREQUENCIES = [
  { label: '1日1回', dosesPerDay: 1 },
  { label: '1日2回', dosesPerDay: 2 },
  { label: '1日3回', dosesPerDay: 3 },
  { label: '1日4回', dosesPerDay: 4 },
];

const DOSE_UNITS: DoseUnit[] = ['mL', 'g', 'mg'];

function calcAgeFromDob(year: string, month: string, day: string): string {
  if (!year || !month || !day) return '';
  const birth = new Date(Number(year), Number(month) - 1, Number(day));
  if (isNaN(birth.getTime())) return '';
  const today = new Date();
  let a = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
  return String(Math.max(0, a));
}

function fmtNum(n: number, d = 3): string {
  return parseFloat(n.toFixed(d)).toString();
}

interface PreviewResult {
  lines: string[];
  hasConversion: boolean;
  isLiquid: boolean;
  isMgNoConc: boolean;
}

function buildPreview(drug: DrugEntry): PreviewResult | null {
  const dailyVal = parseFloat(toHalfWidth(drug.dose_value)); // 1日量
  const days = parseInt(toHalfWidth(drug.days_supply));
  const dpd = parseInt(toHalfWidth(drug.doses_per_day));
  if (isNaN(dailyVal) || dailyVal <= 0 || isNaN(days) || days <= 0 || isNaN(dpd) || dpd <= 0) return null;

  const perDose = dailyVal / dpd; // 1回量 = 1日量 ÷ 分N
  const unit = drug.dose_unit;
  const isLiquid = unit === 'mL';

  if (unit === 'mg') {
    const conc = drug.concentration_mg_per_g;
    if (!conc || conc <= 0) {
      const total = dailyVal * days;
      return {
        lines: [
          `1日量 ${fmtNum(dailyVal)}mg ÷ 分${dpd} = 1回量 ${fmtNum(perDose)}mg`,
          `${fmtNum(dailyVal)}mg × ${days}日分 = ${fmtNum(total)}mg`,
        ],
        hasConversion: false, isLiquid: false, isMgNoConc: true,
      };
    }
    const perDoseG = perDose / conc; // 1回製剤量(g)
    const totalG = perDoseG * dpd * days;
    return {
      lines: [
        `1日量 ${fmtNum(dailyVal)}mg ÷ 分${dpd} = 1回量 ${fmtNum(perDose)}mg`,
        `成分量 ${fmtNum(perDose)}mg ÷ ${fmtNum(conc)}mg/g = 製剤量 ${fmtNum(perDoseG, 4)}g/回`,
        `${fmtNum(perDoseG, 4)}g × 分${dpd} × ${days}日分 = ${fmtNum(totalG, 4)}g`,
      ],
      hasConversion: true, isLiquid: false, isMgNoConc: false,
    };
  }

  const perDoseRounded = parseFloat(perDose.toFixed(4));
  const total = parseFloat((dailyVal * days).toFixed(4));
  return {
    lines: [
      `1日量 ${fmtNum(dailyVal)}${unit} ÷ 分${dpd} = 1回量 ${fmtNum(perDoseRounded)}${unit}`,
      `${fmtNum(dailyVal)}${unit} × ${days}日分 = ${fmtNum(total)}${unit}`,
    ],
    hasConversion: false, isLiquid, isMgNoConc: false,
  };
}

function newDrugEntry(defaultUnit: DoseUnit = 'g', rpGroup = 1): DrugEntry {
  return {
    name: '', dose_value: '', dose_unit: defaultUnit,
    concentration_mg_per_g: null, frequency: '1日3回',
    doses_per_day: '3', days_supply: '7', masterId: null,
    rp_group: rpGroup,
  };
}

// 薬剤名入力コンポーネント（予測変換付き）
function DrugNameInput({
  value,
  master,
  onSelect,
  onChangeName,
  placeholder,
  hasError,
}: {
  value: string;
  master: DrugMaster[];
  onSelect: (drug: DrugMaster) => void;
  onChangeName: (v: string) => void;
  placeholder: string;
  hasError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<DrugMaster[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const handleInput = (v: string) => {
    onChangeName(v);
    const results = searchDrugMaster(v, master);
    setCandidates(results);
    setOpen(results.length > 0 && v.trim().length > 0);
  };

  const handleSelect = (drug: DrugMaster) => {
    onSelect(drug);
    setCandidates([]);
    setOpen(false);
  };

  // 外側クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const categoryColor: Record<string, string> = {
    '抗菌薬': 'bg-red-100 text-red-700',
    '解熱鎮痛': 'bg-orange-100 text-orange-700',
    '去痰': 'bg-teal-100 text-teal-700',
    '鎮咳': 'bg-blue-100 text-blue-700',
    '抗アレルギー': 'bg-green-100 text-green-700',
    '気管支拡張': 'bg-sky-100 text-sky-700',
    'ステロイド': 'bg-yellow-100 text-yellow-700',
    '整腸': 'bg-lime-100 text-lime-700',
    '制吐': 'bg-pink-100 text-pink-700',
    '漢方': 'bg-amber-100 text-amber-700',
    '胃腸': 'bg-cyan-100 text-cyan-700',
    '止痢': 'bg-purple-100 text-purple-700',
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => {
          if (candidates.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className={`w-full border ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]`}
      />
      {open && candidates.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {candidates.map(drug => (
            <button
              key={drug.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-gray-100 last:border-0"
              onMouseDown={e => { e.preventDefault(); handleSelect(drug); }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{drug.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${categoryColor[drug.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {drug.category}
                  </span>
                  {drug.concentration_mg_per_g && (
                    <span className="text-xs text-gray-400">{drug.concentration_mg_per_g}mg/g</span>
                  )}
                  {drug.dose_frequency && (
                    <span className="text-xs text-gray-400">{drug.dose_frequency}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${
                drug.dose_default_unit === 'mL' ? 'bg-cyan-100 text-cyan-700' : 'bg-blue-50 text-[#2196f3]'
              }`}>
                {drug.dose_default_unit ?? 'g'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManualInputScreen({ onResult, onBack, defaultPowderUnit = 'g' }: Props) {
  const [name, setName] = useState('');
  const [ageMode, setAgeMode] = useState<'age' | 'dob'>('age');
  const [age, setAge] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [weight, setWeight] = useState(10);
  const [weightText, setWeightText] = useState('10');
  const [drugs, setDrugs] = useState<DrugEntry[]>([newDrugEntry(defaultPowderUnit)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [master, setMaster] = useState<DrugMaster[]>([]);

  useEffect(() => {
    loadDrugMaster().then(setMaster);
  }, []);

  const adjustWeight = (delta: number) => {
    const next = Math.max(1, Math.round((weight + delta) * 10) / 10);
    setWeight(next);
    setWeightText(String(next));
    setErrors(p => ({ ...p, weight: '' }));
  };

  const handleWeightText = (val: string) => {
    const v = toHalfWidth(val);
    setWeightText(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0) setWeight(n);
    setErrors(p => ({ ...p, weight: '' }));
  };

  const addDrug = () => setDrugs(d => {
    const maxRp = Math.max(...d.map(x => x.rp_group));
    return [...d, newDrugEntry(defaultPowderUnit, maxRp + 1)];
  });
  const removeDrug = (i: number) => setDrugs(d => d.filter((_, idx) => idx !== i));
  const updateDrug = <K extends keyof DrugEntry>(i: number, key: K, val: DrugEntry[K]) =>
    setDrugs(d => d.map((item, idx) => (idx === i ? { ...item, [key]: val } : item)));

  const handleFrequencyChange = (i: number, label: string) => {
    const f = FREQUENCIES.find(x => x.label === label) ?? FREQUENCIES[2];
    setDrugs(d => d.map((item, idx) =>
      idx === i ? { ...item, frequency: label, doses_per_day: String(f.dosesPerDay) } : item
    ));
  };

  const handleMasterSelect = (i: number, drug: DrugMaster) => {
    // 水薬(mL)はマスタのまま、粉薬は薬局設定のデフォルト単位を優先
    const masterUnit = (drug.dose_default_unit ?? 'g') as DoseUnit;
    const unit: DoseUnit = masterUnit === 'mL' ? 'mL' : defaultPowderUnit;
    // デフォルト用法をマスタから取得
    const freqLabel = drug.dose_frequency
      ? FREQUENCIES.find(f => drug.dose_frequency!.includes(f.label.replace('1日', '').trim()))?.label
        ?? FREQUENCIES.find(f => drug.dose_frequency!.includes('3回'))?.label
        ?? '1日3回'
      : '1日3回';
    const dpd = FREQUENCIES.find(f => f.label === freqLabel)?.dosesPerDay ?? 3;

    setDrugs(d => d.map((item, idx) => idx === i ? {
      ...item,
      name: drug.name,
      dose_unit: unit,
      concentration_mg_per_g: drug.concentration_mg_per_g ?? null,
      frequency: freqLabel,
      doses_per_day: String(dpd),
      masterId: drug.id,
    } : item));
    setErrors(p => ({ ...p, [`drug_${i}_name`]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '患者名を入力してください';

    if (ageMode === 'age') {
      if (!age.trim() || isNaN(Number(age)) || Number(age) < 0 || Number(age) > 18)
        e.age = '0〜18の数字を入力してください';
    } else {
      if (!dobYear || !dobMonth || !dobDay) e.dob = '年・月・日をすべて入力してください';
      else if (calcAgeFromDob(dobYear, dobMonth, dobDay) === '') e.dob = '正しい日付を入力してください';
    }

    if (isNaN(parseFloat(weightText)) || parseFloat(weightText) <= 0)
      e.weight = '体重を入力してください';

    drugs.forEach((d, i) => {
      if (!d.name.trim()) e[`drug_${i}_name`] = '薬剤名を入力してください';
      const dv = parseFloat(toHalfWidth(d.dose_value));
      if (isNaN(dv) || dv <= 0) e[`drug_${i}_dose`] = '1日量を入力してください';
      const ds = parseInt(toHalfWidth(d.days_supply));
      if (isNaN(ds) || ds <= 0) e[`drug_${i}_days`] = '日数を入力してください';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCheck = () => {
    if (!validate()) return;
    const resolvedAge = ageMode === 'age' ? age : calcAgeFromDob(dobYear, dobMonth, dobDay);
    const patient: PatientInfo = { name, age: resolvedAge, weight: weightText };

    const entries = drugs.map(d => {
      const dailyVal = parseFloat(toHalfWidth(d.dose_value)); // 1日量
      const dpd = parseInt(toHalfWidth(d.doses_per_day));
      return {
        name: d.name,
        dose: `${fmtNum(dailyVal)}${d.dose_unit}（1日量）`,
        frequency: d.frequency,
        dose_amount: dailyVal, // 1日量をそのまま渡す
        dose_unit: d.dose_unit,
        concentration_mg_per_g: d.dose_unit === 'mg' && d.concentration_mg_per_g ? d.concentration_mg_per_g : undefined,
        doses_per_day: dpd,
        days_supply: parseInt(toHalfWidth(d.days_supply)),
        is_liquid: d.dose_unit === 'mL' || undefined,
        rp_group: d.rp_group,
      };
    });

    onResult(patient, buildMedicationsFromInput(entries));
  };

  const computedAge = calcAgeFromDob(dobYear, dobMonth, dobDay);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#2196f3] px-5 pt-12 pb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-white/80 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" />戻る
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">処方箋を手入力</h2>
            <p className="text-blue-100 text-xs">医薬品名・用量を直接入力してチェック</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Patient section */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">患者情報</p>

          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <label className="text-xs font-semibold text-gray-600">患者名</label>
              <span className="text-gray-400 text-xs">仮名でも可</span>
            </div>
            <input type="text" value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
              placeholder="例：山田 太郎"
              className={`w-full border ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3] transition-all`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-semibold text-gray-600">年齢 / 生年月日</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button onClick={() => setAgeMode('age')}
                  className={`px-3 py-1 font-medium transition-colors ${ageMode === 'age' ? 'bg-[#2196f3] text-white' : 'text-gray-500 bg-white'}`}>年齢</button>
                <button onClick={() => setAgeMode('dob')}
                  className={`px-3 py-1 font-medium transition-colors ${ageMode === 'dob' ? 'bg-[#2196f3] text-white' : 'text-gray-500 bg-white'}`}>生年月日</button>
              </div>
            </div>

            {ageMode === 'age' ? (
              <div className="relative">
                <input type="text" inputMode="numeric" value={age}
                  onChange={e => { setAge(toHalfWidth(e.target.value)); setErrors(p => ({ ...p, age: '' })); }}
                  placeholder="例：5"
                  className={`w-full border ${errors.age ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3] transition-all`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">歳</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input type="text" inputMode="numeric" value={dobYear}
                      onChange={e => { setDobYear(toHalfWidth(e.target.value)); setErrors(p => ({ ...p, dob: '' })); }}
                      placeholder="2020" maxLength={4}
                      className={`w-full border ${errors.dob ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">年</span>
                  </div>
                  <div className="w-16 relative">
                    <input type="text" inputMode="numeric" value={dobMonth}
                      onChange={e => { setDobMonth(toHalfWidth(e.target.value)); setErrors(p => ({ ...p, dob: '' })); }}
                      placeholder="1"
                      className={`w-full border ${errors.dob ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">月</span>
                  </div>
                  <div className="w-16 relative">
                    <input type="text" inputMode="numeric" value={dobDay}
                      onChange={e => { setDobDay(toHalfWidth(e.target.value)); setErrors(p => ({ ...p, dob: '' })); }}
                      placeholder="1"
                      className={`w-full border ${errors.dob ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">日</span>
                  </div>
                </div>
                {computedAge !== '' && !errors.dob && (
                  <p className="text-[#2196f3] text-xs font-medium pl-1">年齢：{computedAge}歳</p>
                )}
              </div>
            )}
            {(errors.age || errors.dob) && (
              <p className="text-red-500 text-xs mt-1">{errors.age || errors.dob}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">体重</label>
            <div className="flex items-center gap-3">
              <button onClick={() => adjustWeight(-0.5)}
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors flex-shrink-0">
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <div className="relative flex-1">
                <input type="text" inputMode="decimal" value={weightText}
                  onChange={e => handleWeightText(e.target.value)}
                  className={`w-full border ${errors.weight ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-center text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3] transition-all`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">kg</span>
              </div>
              <button onClick={() => adjustWeight(0.5)}
                className="w-10 h-10 rounded-xl bg-[#2196f3] flex items-center justify-center active:bg-blue-600 transition-colors flex-shrink-0">
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[5, 10, 15, 20, 25, 30].map(v => (
                <button key={v}
                  onClick={() => { setWeight(v); setWeightText(String(v)); setErrors(p => ({ ...p, weight: '' })); }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${weight === v ? 'bg-[#2196f3] text-white border-[#2196f3]' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {v}kg
                </button>
              ))}
            </div>
            {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
          </div>
        </div>

        {/* Drugs section */}
        <div className="space-y-3">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-1">処方薬剤</p>

          {drugs.map((drug, i) => {
            const preview = buildPreview(drug);
            const isLiquid = drug.dose_unit === 'mL';
            const isMg = drug.dose_unit === 'mg';
            const isFromMaster = !!drug.masterId;
            // 薬剤2以降: 既存Rpグループの選択肢を動的に構築（自分より前の薬剤のRp + 新しいRp）
            const existingRps = i > 0
              ? [...new Set(drugs.slice(0, i).map(d => d.rp_group))].sort((a, b) => a - b)
              : [];
            const maxExistingRp = existingRps.length > 0 ? Math.max(...existingRps) : 0;
            const newRpOption = maxExistingRp + 1;
            const rpOptions = i > 0 ? [...existingRps, newRpOption] : [];

            return (
              <div key={i} className={`bg-white rounded-2xl p-4 border shadow-sm space-y-3 ${isFromMaster ? 'border-[#2196f3]/30' : 'border-gray-100'}`}>
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#2196f3] text-sm font-bold">薬剤 {i + 1}</span>
                    {isLiquid ? (
                      <span className="flex items-center gap-0.5 bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                        <Droplets className="w-2.5 h-2.5" />水薬
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 bg-blue-50 text-[#2196f3] text-xs px-2 py-0.5 rounded-full font-semibold">
                        <FlaskConical className="w-2.5 h-2.5" />粉薬
                      </span>
                    )}
                    {isFromMaster && (
                      <span className="flex items-center gap-0.5 bg-green-50 text-green-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                        <CheckCircle2 className="w-2.5 h-2.5" />マスタ選択
                      </span>
                    )}
                  </div>
                  {drugs.length > 1 && (
                    <button onClick={() => removeDrug(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Rpグループ選択（薬剤2以降のみ） */}
                {i > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Rp番号
                      <span className="ml-1.5 text-gray-400 font-normal">（同じRpは合算されます）</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {rpOptions.map(rp => (
                        <button
                          key={rp}
                          onClick={() => updateDrug(i, 'rp_group', rp)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            drug.rp_group === rp
                              ? rp === newRpOption
                                ? 'bg-gray-600 text-white border-gray-600'
                                : 'bg-[#2196f3] text-white border-[#2196f3]'
                              : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {rp === newRpOption ? `Rp${rp}（新規）` : `Rp${rp}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 医薬品名（予測変換付き） */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    医薬品名
                    <span className="ml-1.5 text-gray-400 font-normal">（入力すると候補が出ます）</span>
                  </label>
                  <DrugNameInput
                    value={drug.name}
                    master={master}
                    onSelect={d => handleMasterSelect(i, d)}
                    onChangeName={v => {
                      updateDrug(i, 'name', v);
                      // 名前を変更したらマスタ選択解除
                      if (drug.masterId) updateDrug(i, 'masterId', null);
                      setErrors(p => ({ ...p, [`drug_${i}_name`]: '' }));
                    }}
                    placeholder={isLiquid ? '例：カルボシステインシロップ' : '例：アモキシシリン細粒10%'}
                    hasError={!!errors[`drug_${i}_name`]}
                  />
                  {errors[`drug_${i}_name`] && <p className="text-red-500 text-xs mt-1">{errors[`drug_${i}_name`]}</p>}
                  {/* マスタ選択時: 含量表示 */}
                  {isFromMaster && isMg && drug.concentration_mg_per_g && (
                    <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      含量 {drug.concentration_mg_per_g}mg/g を自動設定しました
                    </p>
                  )}
                </div>

                {/* 1日量 + 単位 */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">1日量</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={drug.dose_value}
                      onChange={e => { updateDrug(i, 'dose_value', toHalfWidth(e.target.value)); setErrors(p => ({ ...p, [`drug_${i}_dose`]: '' })); }}
                      placeholder={isLiquid ? '例: 15' : isMg ? '例: 300' : '例: 1.5'}
                      className={`w-full border ${errors[`drug_${i}_dose`] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]`}
                    />
                    {errors[`drug_${i}_dose`] && <p className="text-red-500 text-xs mt-1">{errors[`drug_${i}_dose`]}</p>}
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">単位</label>
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 h-[42px]">
                      {DOSE_UNITS.map(u => (
                        <button key={u}
                          onClick={() => {
                            updateDrug(i, 'dose_unit', u);
                            // 単位変更時はマスタ選択を維持しつつ含量をリセット（単位がmg以外になったなら含量不要）
                            if (u !== 'mg') updateDrug(i, 'concentration_mg_per_g', null);
                          }}
                          className={`flex-1 text-xs font-bold transition-colors ${drug.dose_unit === u ? (u === 'mL' ? 'bg-cyan-500 text-white' : 'bg-[#2196f3] text-white') : 'text-gray-400 hover:text-gray-600'}`}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* mg + マスタ未選択の場合のみ警告（含量手入力欄は廃止、マスタから自動取得） */}
                {isMg && !isFromMaster && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <p className="text-amber-600 text-xs font-semibold">含量が不明です</p>
                    <p className="text-amber-500 text-xs mt-0.5">
                      薬剤名を上の候補から選択すると、含量が自動で設定されます。
                    </p>
                  </div>
                )}

                {/* 用法 + 日数 */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">用法</label>
                    <select
                      value={drug.frequency}
                      onChange={e => handleFrequencyChange(i, e.target.value)}
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]"
                    >
                      {FREQUENCIES.map(f => <option key={f.label}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">日数</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={drug.days_supply}
                        onChange={e => { updateDrug(i, 'days_supply', toHalfWidth(e.target.value)); setErrors(p => ({ ...p, [`drug_${i}_days`]: '' })); }}
                        placeholder="7"
                        className={`w-full border ${errors[`drug_${i}_days`] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">日分</span>
                    </div>
                    {errors[`drug_${i}_days`] && <p className="text-red-500 text-xs mt-1">{errors[`drug_${i}_days`]}</p>}
                  </div>
                </div>

                {/* 秤量計算式プレビュー */}
                {preview && (
                  <div className={`rounded-xl px-3 py-2.5 border ${
                    isLiquid ? 'bg-cyan-50 border-cyan-200' :
                    preview.isMgNoConc ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-100'
                  }`}>
                    <p className="text-gray-400 text-xs mb-1">秤量計算</p>
                    {preview.lines.map((line, li) => (
                      <p key={li} className={`text-xs font-mono font-bold leading-relaxed ${
                        isLiquid ? 'text-cyan-700' :
                        preview.isMgNoConc ? 'text-amber-600' :
                        li === 0 && preview.hasConversion ? 'text-amber-600' :
                        'text-[#2196f3]'
                      }`}>
                        {line}
                      </p>
                    ))}
                    {preview.isMgNoConc && (
                      <p className="text-amber-500 text-xs mt-1">薬剤名の候補を選択すると含量が自動設定されます</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={addDrug}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-3 flex items-center justify-center gap-2 text-gray-400 text-sm hover:border-[#2196f3] hover:text-[#2196f3] transition-colors"
          >
            <Plus className="w-4 h-4" />
            薬剤を追加
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="px-5 pb-10 pt-4 bg-white border-t border-gray-100">
        <button
          onClick={handleCheck}
          className="w-full bg-[#2196f3] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          チェックする
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
