import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, User, Scale, Calendar, ExternalLink, ClipboardCheck, ChevronRight as ChevronRightIcon, Droplets, FlaskConical, Layers } from 'lucide-react';
import type { PatientInfo, Medication, DispenseCalc, RpLiquidSummary } from '../types';
import { calcDispenseCalcs, calcRpLiquidSummaries } from '../utils/liquidBottle';

interface Props {
  imageDataUrl: string;
  patientInfo: PatientInfo;
  medications: Medication[];
  onDispenseComplete: () => void;
  onBack: () => void;
}

function fmt(n: number, digits = 3): string {
  return parseFloat(n.toFixed(digits)).toString();
}

const statusConfig = {
  safe: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', label: '安全' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: '注意' },
  danger: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: '要確認' },
};

function pmdaUrl(med: Medication): string {
  if (med.pmdaLink) return med.pmdaLink;
  return `https://www.pmda.go.jp/PmdaSearch/iyakuSearch/?name=${encodeURIComponent(med.name.replace(/[\s　]+/g, ''))}&language=ja`;
}

function MedCard({ med }: { med: Medication }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[med.status];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(v => !v)}>
        <Icon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-gray-800 text-sm truncate">{med.name}</p>
            {med.is_liquid && (
              <span className="flex items-center gap-0.5 bg-cyan-100 text-cyan-700 text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                <Droplets className="w-2.5 h-2.5" />水薬
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-0.5">{med.dose} · {med.frequency}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color} bg-white border ${cfg.border} flex-shrink-0`}>{cfg.label}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-200 pt-3">
          {med.notes && <p className="text-gray-600 text-xs leading-relaxed">{med.notes}</p>}
          <a href={pmdaUrl(med)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#2196f3] text-xs font-semibold"
            onClick={e => e.stopPropagation()}>
            <ExternalLink className="w-3.5 h-3.5" />{med.pmdaLink ? '添付文書を開く（PMDA直リンク）' : '添付文書を検索（PMDA）'}
          </a>
        </div>
      )}
    </div>
  );
}

function DispenseCalcCard({ calc }: { calc: DispenseCalc }) {
  const [expanded, setExpanded] = useState(false);

  const dailyAmount = calc.doseAmount; // 1日量
  const dailyUnit = calc.doseUnit;
  const perDose = parseFloat((dailyAmount / calc.dosesPerDay).toFixed(4)); // 1回量（参考）

  // 簡易サブテキスト: 1日量 × 日数
  const subText = calc.isLiquid
    ? `${fmt(dailyAmount)}mL × ${calc.daysSupply}日`
    : `${fmt(dailyAmount)}${dailyUnit} × ${calc.daysSupply}日`;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${calc.isLiquid ? 'border-cyan-200' : 'border-blue-100'}`}>
      {/* 簡易ヘッダー（常時表示） */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${calc.isLiquid ? 'bg-cyan-100' : 'bg-blue-50'}`}>
          {calc.isLiquid
            ? <FlaskConical className="w-5 h-5 text-cyan-600" />
            : (
              <div className="w-5 h-5 rounded bg-[#2196f3]/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-[#2196f3]" />
              </div>
            )
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-gray-800 text-sm truncate">{calc.name}</p>
            {calc.isLiquid && (
              <span className="flex items-center gap-0.5 bg-cyan-100 text-cyan-700 text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                <Droplets className="w-2.5 h-2.5" />水薬
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{subText}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className={`text-sm font-bold ${calc.isLiquid ? 'text-cyan-700' : 'text-[#2196f3]'}`}>
            {calc.totalAmount}{calc.totalUnit}
          </span>
          {calc.isLiquid && calc.bottleSizeMl && (
            <span className="text-cyan-500 text-xs">{calc.bottleSizeMl}mL容器</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-300 ml-1 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 ml-1 flex-shrink-0" />}
      </button>

      {/* 詳細（タップで展開） */}
      {expanded && (
        <div className={`border-t px-4 pb-4 pt-3 space-y-3 ${calc.isLiquid ? 'border-cyan-100' : 'border-blue-50'}`}>

          {/* 計算式（薬剤師確認用） */}
          <div className={`rounded-xl px-3 py-2.5 ${calc.isLiquid ? 'bg-cyan-50' : calc.isMg ? 'bg-amber-50' : 'bg-blue-50'}`}>
            <p className="text-gray-400 text-xs mb-1">計算式（薬剤師確認用）</p>
            {calc.formulaText.split('\n').map((line, li) => (
              <p key={li} className={`text-xs font-bold font-mono leading-relaxed ${
                calc.isLiquid ? 'text-cyan-700' :
                calc.isMg && li === 0 ? 'text-amber-600' :
                'text-[#2196f3]'
              }`}>{line}</p>
            ))}
          </div>

          {/* 秤量サマリー：1日量メイン・1回量サブ */}
          {(() => {
            // doseAmountG は1回量の製剤量(g)。1日製剤量 = 1回量(g) × 分N
            const dailyG = calc.isMg && calc.doseAmountG !== undefined
              ? parseFloat((calc.doseAmountG * calc.dosesPerDay).toFixed(4))
              : undefined;
            return (
              <div className={`grid gap-2 ${dailyG !== undefined ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className={`rounded-xl p-3 text-center ${calc.isLiquid ? 'bg-cyan-50' : 'bg-blue-50'}`}>
                  <p className={`text-xs font-semibold mb-0.5 ${calc.isLiquid ? 'text-cyan-600' : 'text-[#2196f3]'}`}>1日量</p>
                  <p className="text-gray-800 text-base font-bold">{fmt(dailyAmount)}</p>
                  <p className="text-gray-400 text-xs">{dailyUnit}</p>
                  <p className="text-gray-400 text-xs mt-0.5">1回 {fmt(perDose)}{dailyUnit}</p>
                </div>
                {dailyG !== undefined && (
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-amber-600 text-xs font-semibold mb-0.5">1日製剤量</p>
                    <p className="text-gray-800 text-base font-bold">{fmt(dailyG)}</p>
                    <p className="text-gray-400 text-xs">g</p>
                    <p className="text-gray-400 text-xs mt-0.5">1回 {fmt(calc.doseAmountG!)}g</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-gray-500 text-xs font-semibold mb-0.5">{calc.daysSupply}日分</p>
                  <p className="text-gray-800 text-base font-bold">分{calc.dosesPerDay}</p>
                  <p className="text-gray-400 text-xs">回/日</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-green-600 text-xs font-semibold mb-0.5">秤量</p>
                  <p className="text-gray-800 text-base font-bold">{calc.totalAmount}</p>
                  <p className="text-gray-400 text-xs">{calc.totalUnit}</p>
                </div>
              </div>
            );
          })()}

          {/* 水薬専用: 容器・加水・完成イメージ */}
          {calc.isLiquid && calc.bottleSizeMl !== undefined && (
            <>
              <div className="bg-cyan-600 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-xs font-semibold mb-0.5">完成イメージ</p>
                  <p className="text-white text-sm font-bold">{calc.bottleSizeMl}mL容器</p>
                  {calc.cupScaleMl && (
                    <p className="text-cyan-200 text-xs">{calc.cupScaleMl}mLカップ（0.5mL刻み）</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-cyan-100 text-xs font-semibold mb-0.5">1回服用量</p>
                  <p className="text-white text-2xl font-bold">
                    {calc.doseVolumeMl ?? calc.doseAmount}
                    <span className="text-sm ml-0.5">mL</span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-500 text-xs font-semibold mb-2">水薬瓶の選択</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[30, 60, 100, 200, 300].map(size => (
                    <div key={size}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${size === calc.bottleSizeMl ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-white text-gray-400 border-gray-200'}`}>
                      {size}mL
                    </div>
                  ))}
                </div>
              </div>

              {calc.addedWaterMl !== undefined && calc.addedWaterMl > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <p className="text-amber-600 text-xs font-semibold">加水が必要</p>
                  <p className="text-gray-700 text-xs mt-0.5">
                    精製水（またはシロップ）を <span className="font-bold text-amber-700">{calc.addedWaterMl}mL</span> 加水してください
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RpLiquidSummaryCard({ summary }: { summary: RpLiquidSummary }) {
  const BOTTLE_SIZES = [30, 60, 100, 200, 300];
  return (
    <div className="bg-cyan-600 rounded-2xl overflow-hidden shadow-md">
      {/* ヘッダー */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-cyan-500/50">
        <Layers className="w-4 h-4 text-cyan-200" />
        <p className="text-cyan-100 text-xs font-bold">Rp{summary.rpGroup} — 水薬合算</p>
      </div>
      {/* 薬剤リスト */}
      <div className="px-4 pt-2 pb-1 space-y-0.5">
        {summary.names.map((n, i) => (
          <p key={i} className="text-white/80 text-xs">
            {'＋ '.repeat(i > 0 ? 1 : 0)}{n}
          </p>
        ))}
      </div>
      {/* 合算数値 */}
      <div className="px-4 pb-3 pt-2 grid grid-cols-3 gap-2">
        <div className="bg-white/15 rounded-xl p-2.5 text-center">
          <p className="text-cyan-200 text-xs mb-0.5">合算1回量</p>
          <p className="text-white text-lg font-bold">{summary.totalDoseMl}<span className="text-sm ml-0.5">mL</span></p>
        </div>
        <div className="bg-white/15 rounded-xl p-2.5 text-center">
          <p className="text-cyan-200 text-xs mb-0.5">合算秤量</p>
          <p className="text-white text-lg font-bold">{summary.totalVolumeMl}<span className="text-sm ml-0.5">mL</span></p>
          <p className="text-cyan-200 text-xs">分{summary.dosesPerDay}×{summary.daysSupply}日</p>
        </div>
        <div className="bg-white/15 rounded-xl p-2.5 text-center">
          <p className="text-cyan-200 text-xs mb-0.5">推奨容器</p>
          <p className="text-white text-lg font-bold">{summary.bottleSizeMl}<span className="text-sm ml-0.5">mL</span></p>
          {summary.cupScaleMl && (
            <p className="text-cyan-200 text-xs">{summary.cupScaleMl}mLカップ（0.5mL刻み）</p>
          )}
        </div>
      </div>
      {/* 容器選択バー */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {BOTTLE_SIZES.map(size => (
            <div key={size}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                size === summary.bottleSizeMl
                  ? 'bg-white text-cyan-700 border-white'
                  : 'bg-transparent text-cyan-300 border-cyan-400/40'
              }`}>
              {size}mL
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DispensingScreen({ imageDataUrl, patientInfo, medications, onDispenseComplete, onBack }: Props) {
  const dispenseCalcs = calcDispenseCalcs(medications);
  const rpLiquidSummaries = calcRpLiquidSummaries(dispenseCalcs);
  const hasCalcs = dispenseCalcs.length > 0;
  const [slideIndex, setSlideIndex] = useState(0);

  const dangerCount = medications.filter(m => m.status === 'danger').length;
  const warningCount = medications.filter(m => m.status === 'warning').length;

  const slides = [
    {
      label: '薬剤チェック',
      content: (
        <div className="space-y-3">
          {medications.map((med, i) => <MedCard key={i} med={med} />)}
        </div>
      ),
    },
    ...(hasCalcs ? [{
      label: '調製計算',
      content: (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-start gap-2">
            <FlaskConical className="w-4 h-4 text-[#2196f3] mt-0.5 flex-shrink-0" />
            <p className="text-[#2196f3] text-xs leading-relaxed">
              1日量 × 日数 = 秤量 の計算式を確認してください。水薬は容器・加水量も表示されます。
            </p>
          </div>
          {/* Rpグループ別に整理して表示 */}
          {(() => {
            // Rpグループ番号の重複なしリスト（順序通り）
            const rpGroups = [...new Set(dispenseCalcs.map(c => c.rpGroup))].sort((a, b) => a - b);
            return rpGroups.map(rp => {
              const group = dispenseCalcs.filter(c => c.rpGroup === rp);
              const rpSummary = rpLiquidSummaries.find(s => s.rpGroup === rp);
              return (
                <div key={rp} className="space-y-2">
                  {/* Rpラベル（複数グループあるときのみ表示） */}
                  {rpGroups.length > 1 && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Rp{rp}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  {group.map((calc, i) => <DispenseCalcCard key={i} calc={calc} />)}
                  {/* 同Rp内に複数水薬がある場合の合算サマリー */}
                  {rpSummary && <RpLiquidSummaryCard summary={rpSummary} />}
                </div>
              );
            });
          })()}
        </div>
      ),
    }] : []),
    ...(imageDataUrl ? [{
      label: '処方箋画像',
      content: (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <img src={imageDataUrl} alt="処方箋" className="w-full object-contain max-h-[55vh]" />
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#2196f3] px-5 pt-12 pb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-white/70 text-sm mb-3">
          <ChevronRightIcon className="w-4 h-4 rotate-180" />戻る
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">調剤支援モード</p>
            <h2 className="text-white text-xl font-bold mt-0.5">調剤チェック</h2>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${dangerCount > 0 ? 'bg-red-500/30 text-red-100' : warningCount > 0 ? 'bg-amber-400/30 text-amber-100' : 'bg-green-500/30 text-green-100'}`}>
            {dangerCount > 0 ? <XCircle className="w-3.5 h-3.5" /> : warningCount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {dangerCount > 0 ? '要確認あり' : warningCount > 0 ? '注意あり' : 'チェック済'}
          </div>
        </div>
        <div className="mt-3 bg-white/15 rounded-xl px-3 py-2.5 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-100" />
            <span className="text-white text-sm font-semibold">{patientInfo.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-100" />
            <span className="text-blue-100 text-xs">{patientInfo.age}歳</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-blue-100" />
            <span className="text-blue-100 text-xs">{patientInfo.weight}kg</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        {slides.map((s, i) => (
          <button key={s.label} onClick={() => setSlideIndex(i)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${slideIndex === i ? 'text-[#2196f3] border-b-2 border-[#2196f3]' : 'text-gray-400'}`}>
            {s.label === '調製計算' && <FlaskConical className="w-3.5 h-3.5" />}
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {slides[slideIndex].content}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-5 mb-2">
            <button onClick={() => setSlideIndex(i => Math.max(0, i - 1))} disabled={slideIndex === 0}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-30 shadow-sm">
              <ChevronRightIcon className="w-4 h-4 text-gray-500 rotate-180" />
            </button>
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === slideIndex ? 'bg-[#2196f3]' : 'bg-gray-300'}`} />
              ))}
            </div>
            <button onClick={() => setSlideIndex(i => Math.min(slides.length - 1, i + 1))} disabled={slideIndex === slides.length - 1}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-30 shadow-sm">
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {/* Complete button */}
      <div className="px-5 pb-10 pt-4 bg-white border-t border-gray-100">
        <p className="text-center text-gray-400 text-xs mb-3">
          {hasCalcs ? '薬剤チェックと調製計算を確認したらタップ' : 'チェック完了後にタップしてください'}
        </p>
        <button
          onClick={onDispenseComplete}
          className="w-full bg-[#2196f3] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          <ClipboardCheck className="w-5 h-5" />
          調剤完了
        </button>
      </div>
    </div>
  );
}