import { Camera, FileText, ClipboardList, ChevronRight, Settings } from 'lucide-react';

interface Props {
  onCamera: () => void;
  onManual: () => void;
  onAudit: () => void;
  onSettings: () => void;
  pharmacyName?: string;
}

function PediatricLogo() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" aria-hidden="true">
      {/* Bear head */}
      <circle cx="32" cy="33" r="16" fill="white" opacity="0.95" />
      {/* Left ear */}
      <circle cx="19" cy="21" r="6" fill="white" opacity="0.95" />
      <circle cx="19" cy="21" r="3.5" fill="white" opacity="0.6" />
      {/* Right ear */}
      <circle cx="45" cy="21" r="6" fill="white" opacity="0.95" />
      <circle cx="45" cy="21" r="3.5" fill="white" opacity="0.6" />
      {/* Face: eyes */}
      <circle cx="26" cy="31" r="2.2" fill="#2196f3" />
      <circle cx="38" cy="31" r="2.2" fill="#2196f3" />
      <circle cx="26.9" cy="30.2" r="0.8" fill="white" />
      <circle cx="38.9" cy="30.2" r="0.8" fill="white" />
      {/* Muzzle */}
      <ellipse cx="32" cy="38" rx="6" ry="4.5" fill="#2196f3" opacity="0.18" />
      {/* Smile */}
      <path d="M28 38 Q32 42 36 38" stroke="#2196f3" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Medical cross badge on bottom-right */}
      <circle cx="50" cy="50" r="10" fill="#2196f3" />
      <rect x="47" y="45" width="6" height="10" rx="1.5" fill="white" />
      <rect x="45" y="47" width="10" height="6" rx="1.5" fill="white" />
    </svg>
  );
}

export default function HomeScreen({ onCamera, onManual, onAudit, onSettings, pharmacyName }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#2196f3] px-6 pt-14 pb-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <PediatricLogo />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight leading-tight">PharmScope</h1>
              {pharmacyName ? (
                <p className="text-blue-100 text-xs font-medium mt-0.5">{pharmacyName}</p>
              ) : (
                <p className="text-blue-100 text-xs font-medium tracking-wide mt-0.5">小児処方チェックサポートツール</p>
              )}
            </div>
          </div>
          <button
            onClick={onSettings}
            className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors flex-shrink-0"
            aria-label="設定"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-blue-100 text-sm leading-relaxed mt-2">
          処方箋を撮影して、小児用量のチェックをサポートします
        </p>
      </div>

      {/* Main actions */}
      <div className="flex-1 px-5 py-7 space-y-4">
        {/* Camera action — primary */}
        <button
          onClick={onCamera}
          className="w-full bg-[#2196f3] rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-blue-200 active:scale-95 transition-transform text-left"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">処方箋を撮影</p>
            <p className="text-blue-100 text-xs mt-0.5">カメラで処方箋をチェック</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/70 flex-shrink-0" />
        </button>

        {/* Manual input */}
        <button
          onClick={onManual}
          className="w-full bg-white border-2 border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm active:scale-95 transition-transform text-left"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-[#2196f3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 font-bold text-base">処方箋を手入力する</p>
            <p className="text-gray-400 text-xs mt-0.5">医薬品名・用量を直接入力</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
        </button>

        {/* Audit log */}
        <button
          onClick={onAudit}
          className="w-full bg-white border-2 border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm active:scale-95 transition-transform text-left"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-6 h-6 text-[#2196f3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 font-bold text-base">調剤 / 監査記録</p>
            <p className="text-gray-400 text-xs mt-0.5">過去のチェック履歴を確認</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
        </button>

        {/* Info card */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mt-2">
          <p className="text-amber-700 text-xs leading-relaxed">
            <span className="font-semibold">注意：</span>
            本ツールは薬剤師の処方箋監査を補助するツールです。最終判断は必ず薬剤師が行ってください。
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8">
        <p className="text-center text-gray-300 text-xs">
          PMDA 添付文書に基づく安全性チェック
        </p>
      </div>
    </div>
  );
}
