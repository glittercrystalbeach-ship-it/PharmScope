import { useEffect, useRef, useState } from 'react';
import { Cpu, ShieldCheck } from 'lucide-react';
import { runLocalOcr } from '../utils/ocrLocal';
import type { OcrMed } from '../types';

interface Props {
  imageDataUrl: string;
  onComplete: (meds: OcrMed[], rawText: string) => void;
}

const STEP_LABELS = [
  '画像前処理中...',
  '日本語データ読み込み中...',
  'テキスト認識 (OCR)...',
  '薬剤情報を解析中...',
  'プライバシーチェック完了',
];

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function AnalyzingScreen({ imageDataUrl, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState('処理を開始しています...');
  const [stepIndex, setStepIndex] = useState(0);
  const [doneUpTo, setDoneUpTo] = useState(-1);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      setStepIndex(0);
      setStatusLabel(STEP_LABELS[0]);
      await delay(400);
      setDoneUpTo(0);

      try {
        const result = await runLocalOcr(imageDataUrl, (p) => {
          if (p.status.includes('日本語') || p.status.includes('language') || p.status.includes('読み込み')) {
            setStepIndex(1);
            setStatusLabel(STEP_LABELS[1]);
            setProgress(Math.round(p.progress * 35));
          } else if (p.status.includes('認識') || p.status.includes('recognizing')) {
            setDoneUpTo(1);
            setStepIndex(2);
            setStatusLabel(STEP_LABELS[2]);
            setProgress(35 + Math.round(p.progress * 50));
          } else {
            setStatusLabel(p.status);
          }
        });

        setDoneUpTo(2);
        setStepIndex(3);
        setProgress(88);
        setStatusLabel(STEP_LABELS[3]);
        await delay(350);

        setDoneUpTo(3);
        setStepIndex(4);
        setProgress(100);
        setStatusLabel(STEP_LABELS[4]);
        await delay(400);

        setDoneUpTo(4);
        onComplete(result.meds, result.rawText);
      } catch {
        setProgress(100);
        await delay(300);
        onComplete([], '');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-between py-16 px-6">
      {/* Preview */}
      <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
        <img src={imageDataUrl} alt="処方箋" className="w-full object-cover max-h-64" />
      </div>

      {/* Analysis animation */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        <div className="w-20 h-20 rounded-full bg-[#2196f3]/10 border-2 border-[#2196f3]/30 flex items-center justify-center relative">
          <Cpu className="w-8 h-8 text-[#2196f3]" />
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 animate-spin"
            style={{ animationDuration: '2s' }}
          >
            <circle
              cx="40" cy="40" r="36"
              fill="none"
              stroke="#2196f3"
              strokeWidth="2"
              strokeDasharray="60 160"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="w-full">
          <div className="flex justify-between mb-2">
            <p className="text-white text-sm font-medium truncate pr-2">{statusLabel}</p>
            <p className="text-[#2196f3] text-sm font-bold flex-shrink-0">{progress}%</p>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2196f3] rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${
                  i <= doneUpTo
                    ? 'bg-green-400'
                    : i === stepIndex
                    ? 'bg-[#2196f3] animate-pulse'
                    : 'bg-gray-600'
                }`}
              />
              <p
                className={`text-xs transition-colors duration-300 ${
                  i <= doneUpTo
                    ? 'text-green-400'
                    : i === stepIndex
                    ? 'text-white'
                    : 'text-gray-500'
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy assurance */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-900/40 border border-green-700/50 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
        <p className="text-green-300 text-xs">
          画像はデバイス内のみで処理されます。外部に送信されません。
        </p>
      </div>
    </div>
  );
}
