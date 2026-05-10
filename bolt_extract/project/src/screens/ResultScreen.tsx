import { CheckCircle, AlertTriangle, XCircle, ArrowLeft, RotateCcw, ChevronDown, ChevronUp, User, Scale, Calendar, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { PatientInfo, Medication } from '../types';

interface Props {
  imageDataUrl: string;
  patientInfo: PatientInfo;
  medications: Medication[];
  onRestart: () => void;
  onBack: () => void;
}

const statusConfig = {
  safe: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', label: '安全' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: '注意' },
  danger: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: '要確認' },
};

function pmdaUrl(med: Medication): string {
  if (med.pmdaLink) return med.pmdaLink;
  const q = encodeURIComponent(med.name.replace(/[\s　]+/g, ''));
  return `https://www.pmda.go.jp/PmdaSearch/iyakuSearch/?name=${q}&language=ja`;
}

function MedCard({ med }: { med: Medication }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[med.status];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Icon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{med.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{med.dose} · {med.frequency}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color} bg-white border ${cfg.border}`}>
          {cfg.label}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          {med.notes && (
            <p className="text-gray-600 text-xs leading-relaxed border-t border-gray-200 pt-3">{med.notes}</p>
          )}
          {/* PMDA link */}
          <a
            href={pmdaUrl(med)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#2196f3] text-xs font-semibold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {med.pmdaLink ? '添付文書を開く（直リンク）' : '添付文書を検索（PMDA）'}
          </a>
        </div>
      )}
    </div>
  );
}

export default function ResultScreen({ imageDataUrl, patientInfo, medications, onRestart, onBack }: Props) {
  const dangerCount = medications.filter((m) => m.status === 'danger').length;
  const warningCount = medications.filter((m) => m.status === 'warning').length;
  const safeCount = medications.filter((m) => m.status === 'safe').length;

  const overallStatus = dangerCount > 0 ? 'danger' : warningCount > 0 ? 'warning' : 'safe';
  const overallCfg = statusConfig[overallStatus];
  const OverallIcon = overallCfg.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div
        className={`px-5 pt-12 pb-6 ${
          overallStatus === 'safe'
            ? 'bg-green-500'
            : overallStatus === 'warning'
            ? 'bg-amber-500'
            : 'bg-red-500'
        }`}
      >
        <button onClick={onBack} className="flex items-center gap-1 text-white/80 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>
        <div className="flex items-center gap-3 mb-1">
          <OverallIcon className="w-8 h-8 text-white" />
          <div>
            <h2 className="text-white text-xl font-bold">
              {overallStatus === 'safe'
                ? '処方箋は安全です'
                : overallStatus === 'warning'
                ? '注意が必要な薬があります'
                : '要確認の薬があります'}
            </h2>
            <p className="text-white/80 text-xs">
              {medications.length}剤を解析 · 安全 {safeCount} · 注意 {warningCount} · 要確認 {dangerCount}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Patient card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">患者情報</p>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#2196f3]" />
              <span className="text-gray-700 text-sm font-medium">{patientInfo.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2196f3]" />
              <span className="text-gray-700 text-sm">{patientInfo.age}歳</span>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#2196f3]" />
              <span className="text-gray-700 text-sm">{patientInfo.weight}kg</span>
            </div>
          </div>
        </div>

        {/* Prescription thumbnail (camera flow only) */}
        {imageDataUrl && (
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <p className="px-4 pt-4 pb-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">撮影した処方箋</p>
            <img src={imageDataUrl} alt="処方箋" className="w-full max-h-48 object-cover" />
          </div>
        )}

        {/* Medications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">薬品チェック結果</p>
            <p className="text-gray-400 text-xs">タップで詳細 / PMDA</p>
          </div>
          <div className="space-y-3">
            {medications.map((med, i) => (
              <MedCard key={`${med.name}-${i}`} med={med} />
            ))}
          </div>
        </div>

        {/* PMDA info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-blue-700 text-xs font-semibold mb-1">PMDAについて</p>
          <p className="text-blue-600 text-xs leading-relaxed">
            各薬剤カードを開くと「PMDAで添付文書を確認」リンクが表示されます。
            PMDAは直接API連携できないため、薬剤名で検索ページを開きます。
            最新の添付文書・小児用量・禁忌情報を必ずご確認ください。
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-100 rounded-2xl p-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            本ツールの結果は参考情報です。最終的な処方・調剤の判断は、必ず医師・薬剤師が行ってください。
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-10 pt-4 bg-white border-t border-gray-100">
        <button
          onClick={onRestart}
          className="w-full bg-[#2196f3] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          <RotateCcw className="w-4 h-4" />
          新しい処方箋をチェック
        </button>
      </div>
    </div>
  );
}
