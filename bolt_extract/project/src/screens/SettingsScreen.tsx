import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Building2, FlaskConical, CheckCircle2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PharmacySettings, PowderUnit } from '../types';

interface Props {
  settings: PharmacySettings;
  onSave: (settings: PharmacySettings) => void;
  onBack: () => void;
}

export default function SettingsScreen({ settings, onSave, onBack }: Props) {
  const [pharmacyName, setPharmacyName] = useState(settings.pharmacyName);
  const [defaultPowderUnit, setDefaultPowderUnit] = useState<PowderUnit>(settings.defaultPowderUnit);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // settingsが外から変わったとき同期
  useEffect(() => {
    setPharmacyName(settings.pharmacyName);
    setDefaultPowderUnit(settings.defaultPowderUnit);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setError('ログインが必要です'); return; }

    const { error: err } = await supabase
      .from('pharmacies')
      .update({
        name: pharmacyName.trim() || settings.pharmacyName,
        default_powder_unit: defaultPowderUnit,
      })
      .eq('id', user.id);

    setSaving(false);
    if (err) {
      setError('保存に失敗しました。もう一度お試しください。');
      return;
    }

    setSaved(true);
    onSave({ pharmacyName: pharmacyName.trim() || settings.pharmacyName, defaultPowderUnit });
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#2196f3] px-5 pt-12 pb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-white/80 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" />戻る
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">薬局設定</h2>
            <p className="text-blue-100 text-xs">処方箋スタイルに合わせた設定</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* 薬局名 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#2196f3]" />
            <p className="text-gray-700 text-sm font-bold">薬局情報</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">薬局名</label>
            <input
              type="text"
              value={pharmacyName}
              onChange={e => setPharmacyName(e.target.value)}
              placeholder="例：○○調剤薬局"
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]"
            />
          </div>
        </div>

        {/* 粉薬デフォルト単位 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#2196f3]" />
            <p className="text-gray-700 text-sm font-bold">粉薬の入力単位（デフォルト）</p>
          </div>

          <p className="text-gray-500 text-xs leading-relaxed">
            処方箋の記載スタイルに合わせて設定してください。水薬は常に mL で入力します。
          </p>

          <div className="space-y-3">
            {/* g 選択肢 */}
            <button
              onClick={() => setDefaultPowderUnit('g')}
              className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                defaultPowderUnit === 'g'
                  ? 'border-[#2196f3] bg-blue-50'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                defaultPowderUnit === 'g' ? 'border-[#2196f3]' : 'border-gray-300'
              }`}>
                {defaultPowderUnit === 'g' && <div className="w-2.5 h-2.5 rounded-full bg-[#2196f3]" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold ${defaultPowderUnit === 'g' ? 'text-[#2196f3]' : 'text-gray-700'}`}>g（製剤量）</span>
                  <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-medium">標準</span>
                </div>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                  処方箋に製剤量で記載されている場合。
                  <br />例：アモキシシリン細粒10% <span className="font-mono font-semibold">0.5g</span>
                </p>
              </div>
            </button>

            {/* mg 選択肢 */}
            <button
              onClick={() => setDefaultPowderUnit('mg')}
              className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                defaultPowderUnit === 'mg'
                  ? 'border-[#2196f3] bg-blue-50'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                defaultPowderUnit === 'mg' ? 'border-[#2196f3]' : 'border-gray-300'
              }`}>
                {defaultPowderUnit === 'mg' && <div className="w-2.5 h-2.5 rounded-full bg-[#2196f3]" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold ${defaultPowderUnit === 'mg' ? 'text-[#2196f3]' : 'text-gray-700'}`}>mg（成分量）</span>
                </div>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                  処方箋に成分量(mg)で記載されている場合。薬剤マスタの含量から製剤量(g)を自動換算します。
                  <br />例：アモキシシリン細粒10% <span className="font-mono font-semibold">100mg</span> → 1.0g に換算
                </p>
              </div>
            </button>
          </div>

          {/* 現在の設定サマリー */}
          <div className="bg-blue-50 rounded-xl px-3 py-2.5">
            <p className="text-[#2196f3] text-xs font-semibold mb-0.5">現在の設定</p>
            <p className="text-gray-700 text-xs">
              粉薬：<span className="font-bold">{defaultPowderUnit}</span>　水薬：<span className="font-bold">mL</span>（固定）
            </p>
          </div>
        </div>

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="px-5 pb-10 pt-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#2196f3] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-60"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              保存しました
            </>
          ) : saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              設定を保存
            </>
          )}
        </button>
      </div>
    </div>
  );
}
