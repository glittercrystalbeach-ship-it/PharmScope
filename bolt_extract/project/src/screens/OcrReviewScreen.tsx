import { useState } from 'react';
import { ArrowLeft, ChevronRight, Plus, Trash2, ScanLine, AlertTriangle, CreditCard as Edit3 } from 'lucide-react';
import type { OcrMed } from '../types';

interface Props {
  imageDataUrl: string;
  initialMeds: OcrMed[];
  rawText: string;
  onConfirm: (meds: OcrMed[]) => void;
  onBack: () => void;
}

const EMPTY_MED: OcrMed = { name: '', dose: '', frequency: '' };

function MedRow({
  med,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  med: OcrMed;
  index: number;
  onChange: (index: number, field: keyof OcrMed, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-[#2196f3] bg-blue-50 px-2 py-0.5 rounded-full">
          薬剤 {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 active:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">薬剤名</label>
          <input
            type="text"
            value={med.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
            placeholder="例：アモキシシリン細粒10%"
            className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">用量</label>
            <input
              type="text"
              value={med.dose}
              onChange={(e) => onChange(index, 'dose', e.target.value)}
              placeholder="例：0.5g"
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">用法</label>
            <input
              type="text"
              value={med.frequency}
              onChange={(e) => onChange(index, 'frequency', e.target.value)}
              placeholder="例：1日3回 食後"
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OcrReviewScreen({ imageDataUrl, initialMeds, rawText, onConfirm, onBack }: Props) {
  const [meds, setMeds] = useState<OcrMed[]>(
    initialMeds.length > 0 ? initialMeds : [{ ...EMPTY_MED }]
  );
  const [showRaw, setShowRaw] = useState(false);

  const handleChange = (index: number, field: keyof OcrMed, value: string) => {
    setMeds((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const handleRemove = (index: number) => {
    setMeds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    setMeds((prev) => [...prev, { ...EMPTY_MED }]);
  };

  const handleConfirm = () => {
    const valid = meds.filter((m) => m.name.trim().length > 0);
    if (valid.length === 0) return;
    onConfirm(valid);
  };

  const ocrDetected = initialMeds.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#2196f3] px-5 pt-12 pb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-white/80 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Edit3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">OCR結果の確認・修正</h2>
            <p className="text-blue-100 text-xs">読み取り内容を確認し、必要に応じて修正してください</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          {['撮影', '解析', 'OCR確認', '患者情報', '結果'].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 2
                    ? 'bg-[#2196f3] text-white'
                    : i < 2
                    ? 'bg-green-400 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < 2 ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${i === 2 ? 'text-[#2196f3] font-semibold' : i < 2 ? 'text-green-500' : 'text-gray-400'}`}>
                {s}
              </span>
              {i < 4 && <div className={`h-px w-3 ${i < 2 ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* OCR status banner */}
        {ocrDetected ? (
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
            <ScanLine className="w-4 h-4 text-[#2196f3] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[#2196f3] text-xs font-semibold">
                {initialMeds.length}剤を検出しました
              </p>
              <p className="text-blue-600 text-xs mt-0.5 leading-relaxed">
                OCRの精度には限界があります。薬剤名・用量・用法が正しいか必ずご確認ください。
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-700 text-xs font-semibold">薬剤を自動検出できませんでした</p>
              <p className="text-amber-600 text-xs mt-0.5 leading-relaxed">
                手動で薬剤情報を入力してください。画像の向きや文字の鮮明さを確認してください。
              </p>
            </div>
          </div>
        )}

        {/* Prescription image (collapsed) */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-4 pt-3 pb-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">撮影した処方箋</p>
          </div>
          <img src={imageDataUrl} alt="処方箋" className="w-full max-h-40 object-cover" />
        </div>

        {/* Editable med rows */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            薬剤リスト（タップして編集）
          </p>
          <div className="space-y-3">
            {meds.map((med, i) => (
              <MedRow
                key={i}
                med={med}
                index={i}
                onChange={handleChange}
                onRemove={handleRemove}
                canRemove={meds.length > 1}
              />
            ))}
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-2xl py-3.5 flex items-center justify-center gap-2 text-gray-400 text-sm font-semibold active:border-[#2196f3] active:text-[#2196f3] transition-colors"
          >
            <Plus className="w-4 h-4" />
            薬剤を追加
          </button>
        </div>

        {/* Raw OCR text toggle */}
        {rawText && (
          <div className="bg-gray-100 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-gray-500 text-xs font-semibold">OCR 生テキスト（参考）</span>
              <span className="text-gray-400 text-xs">{showRaw ? '閉じる' : '表示'}</span>
            </button>
            {showRaw && (
              <pre className="px-4 pb-4 text-gray-500 text-xs leading-relaxed whitespace-pre-wrap font-mono border-t border-gray-200 pt-3">
                {rawText}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Confirm */}
      <div className="px-5 pb-10 pt-4 bg-white border-t border-gray-100">
        <button
          onClick={handleConfirm}
          disabled={meds.every((m) => !m.name.trim())}
          className="w-full bg-[#2196f3] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-50"
        >
          この内容で確定する
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
