import { CheckCircle2, ArrowLeft, ShieldCheck, ClipboardCheck } from 'lucide-react';
import type { PatientInfo } from '../types';

interface Props {
  patientInfo: PatientInfo;
  onBack: () => void;
  onAudit: () => void;
  onAuditDone: () => void;
}

export default function DispenseConfirmScreen({ patientInfo, onBack, onAudit, onAuditDone }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#2196f3] px-5 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">調剤完了</p>
            <h2 className="text-white text-xl font-bold mt-0.5">次のステップを選択</h2>
          </div>
        </div>
        <div className="bg-white/15 rounded-xl px-4 py-3">
          <p className="text-white font-semibold text-sm">{patientInfo.name}</p>
          <p className="text-blue-100 text-xs mt-0.5">{patientInfo.age}歳 / {patientInfo.weight}kg</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-1 px-5 py-8 flex flex-col gap-4">
        {/* Back to dispensing */}
        <button
          onClick={onBack}
          className="w-full bg-white border-2 border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm active:scale-95 transition-transform text-left"
        >
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 font-bold text-base">調剤に戻る</p>
            <p className="text-gray-400 text-xs mt-0.5">内容を確認・修正する</p>
          </div>
        </button>

        {/* Go to audit */}
        <button
          onClick={onAudit}
          className="w-full bg-[#2196f3] rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-blue-200 active:scale-95 transition-transform text-left"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">監査する</p>
            <p className="text-blue-100 text-xs mt-0.5">監査チェック画面へ進む</p>
          </div>
        </button>

        {/* Already audited */}
        <button
          onClick={onAuditDone}
          className="w-full bg-white border-2 border-green-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm active:scale-95 transition-transform text-left"
        >
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-6 h-6 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 font-bold text-base">監査済み</p>
            <p className="text-gray-400 text-xs mt-0.5">すでに監査が完了している場合</p>
          </div>
        </button>
      </div>
    </div>
  );
}
