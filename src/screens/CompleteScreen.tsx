import { CheckCircle, Clock, User, Scale, Calendar, RotateCcw, ClipboardList } from 'lucide-react';
import type { PatientInfo, Medication } from '../types';

interface Props {
  patientInfo: PatientInfo;
  medications: Medication[];
  dispensedAt: Date;
  auditCompletedAt: Date;
  onNext: () => void;
  onViewLog: () => void;
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function diffMinutes(a: Date, b: Date) {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 60000);
}

export default function CompleteScreen({ patientInfo, medications, dispensedAt, auditCompletedAt, onNext, onViewLog }: Props) {
  const elapsed = diffMinutes(dispensedAt, auditCompletedAt);
  const safeCount = medications.filter(m => m.status === 'safe').length;
  const warnCount = medications.filter(m => m.status === 'warning').length;
  const dangerCount = medications.filter(m => m.status === 'danger').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 flex flex-col items-center justify-between py-16 px-6">
      {/* Success mark */}
      <div />
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-200">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">調剤・監査 完了</h2>
          <p className="text-gray-400 text-sm mt-1">すべての工程が完了しました</p>
        </div>

        {/* Summary card */}
        <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100 p-5 space-y-4">
          {/* Patient */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-800">{patientInfo.name}</p>
              <p className="text-gray-400 text-xs">{patientInfo.age}歳 / {patientInfo.weight}kg</p>
            </div>
          </div>

          {/* Drug summary */}
          <div className="grid grid-cols-3 gap-2 py-1">
            <div className="text-center">
              <p className="text-xl font-bold text-green-500">{safeCount}</p>
              <p className="text-gray-400 text-xs mt-0.5">安全</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-xl font-bold text-amber-500">{warnCount}</p>
              <p className="text-gray-400 text-xs mt-0.5">注意</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-500">{dangerCount}</p>
              <p className="text-gray-400 text-xs mt-0.5">要確認</p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#2196f3]" />
                <span className="text-gray-500 text-xs">調剤完了</span>
              </div>
              <span className="text-gray-700 text-xs font-semibold">{formatTime(dispensedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-gray-500 text-xs">監査完了</span>
              </div>
              <span className="text-gray-700 text-xs font-semibold">{formatTime(auditCompletedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500 text-xs">所要時間</span>
              </div>
              <span className="text-gray-700 text-xs font-semibold">{elapsed}分</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <button onClick={onNext}
          className="w-full bg-[#2196f3] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
          <RotateCcw className="w-4 h-4" />
          次の処方箋をチェックする
        </button>
        <button onClick={onViewLog}
          className="w-full bg-white border border-gray-200 text-gray-600 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
          <ClipboardList className="w-4 h-4" />
          調剤 / 監査記録を見る
        </button>
      </div>
    </div>
  );
}
