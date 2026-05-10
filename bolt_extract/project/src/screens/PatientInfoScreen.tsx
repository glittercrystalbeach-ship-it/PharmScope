import { useState } from 'react';
import { ChevronRight, User, ArrowLeft, ScanLine } from 'lucide-react';
import type { PatientInfo } from '../types';
import { toHalfWidth } from '../utils/normalize';

interface Props {
  ocrMeds?: Array<{ name: string; dose: string; frequency: string }>;
  onSubmit: (info: PatientInfo) => void;
  onBack: () => void;
}

export default function PatientInfoScreen({ ocrMeds, onSubmit, onBack }: Props) {
  const [info, setInfo] = useState<PatientInfo>({ name: '', age: '', weight: '' });
  const [errors, setErrors] = useState<Partial<PatientInfo>>({});

  const validate = () => {
    const e: Partial<PatientInfo> = {};
    if (!info.name.trim()) e.name = '患者名を入力してください';
    if (!info.age.trim()) e.age = '年齢を入力してください';
    else if (isNaN(Number(info.age)) || Number(info.age) < 0 || Number(info.age) > 18)
      e.age = '0〜18の数字を入力してください';
    if (!info.weight.trim()) e.weight = '体重を入力してください';
    else if (isNaN(Number(info.weight)) || Number(info.weight) <= 0 || Number(info.weight) > 150)
      e.weight = '正しい体重を入力してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit(info);
  };

  const field = (
    key: keyof PatientInfo,
    label: string,
    placeholder: string,
    type: string,
    unit?: string
  ) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          inputMode={type === 'number' ? 'decimal' : 'text'}
          value={info[key]}
          onChange={(e) => {
            const val = type === 'number' ? toHalfWidth(e.target.value) : e.target.value;
            setInfo((prev) => ({ ...prev, [key]: val }));
            setErrors((prev) => ({ ...prev, [key]: undefined }));
          }}
          placeholder={placeholder}
          className={`w-full border ${
            errors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
          } rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#2196f3]/40 focus:border-[#2196f3] transition-all`}
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {unit}
          </span>
        )}
      </div>
      {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#2196f3] px-5 pt-12 pb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-white/80 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">患者情報の入力</h2>
            <p className="text-blue-100 text-xs">正確な用量計算のために入力してください</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          {['撮影', '解析', '患者情報', '結果'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 2
                    ? 'bg-[#2196f3] text-white'
                    : i < 2
                    ? 'bg-green-400 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < 2 ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs ${i === 2 ? 'text-[#2196f3] font-semibold' : i < 2 ? 'text-green-500' : 'text-gray-400'}`}
              >
                {s}
              </span>
              {i < 3 && <div className={`flex-1 h-px w-4 ${i < 2 ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">
        {field('name', '患者名', '例：山田 太郎', 'text')}
        {field('age', '年齢', '例：5（全角可）', 'text', '歳')}
        {field('weight', '体重', '例：18.5（全角可）', 'text', 'kg')}

        {/* OCR detected meds preview */}
        {ocrMeds && ocrMeds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine className="w-4 h-4 text-[#2196f3]" />
              <p className="text-[#2196f3] text-xs font-semibold">OCRで検出された薬剤（{ocrMeds.length}剤）</p>
            </div>
            <div className="space-y-1">
              {ocrMeds.map((m, i) => (
                <p key={i} className="text-blue-700 text-xs leading-relaxed">
                  · {m.name}　{m.dose}　{m.frequency}
                </p>
              ))}
            </div>
            <p className="text-blue-400 text-xs mt-2">患者情報を入力して安全性チェックへ進んでください。</p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-700 text-xs leading-relaxed">
            <span className="font-semibold">注意：</span>
            入力された情報はAIによる用量計算にのみ使用されます。
            最終的な処方判断は必ず医師・薬剤師が行ってください。
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="px-6 pb-10 pt-4">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#2196f3] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          安全性チェックを見る
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
