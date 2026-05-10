import { useState, useRef, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, User, Scale, Calendar, ExternalLink, ShieldCheck, ChevronRight, BookOpen, MessageSquare, Undo2 } from 'lucide-react';
import type { PatientInfo, Medication } from '../types';

interface Props {
  imageDataUrl: string;
  patientInfo: PatientInfo;
  medications: Medication[];
  dispensedAt: Date;
  onAuditComplete: () => void;
  onBack: () => void;
}

const statusConfig = {
  safe: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: '安全' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: '注意' },
  danger: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '要確認' },
};

function pmdaUrl(med: Medication): string {
  if (med.pmdaLink) return med.pmdaLink;
  return `https://www.pmda.go.jp/PmdaSearch/iyakuSearch/?name=${encodeURIComponent(med.name.replace(/[\s　]+/g, ''))}&language=ja`;
}

function deriveInteractions(meds: Medication[]): string[] {
  const names = meds.map(m => m.name.toLowerCase());
  const points: string[] = [];
  if (names.some(n => n.includes('クラリスロマイシン'))) {
    points.push('クラリスロマイシン：消化器症状（嘔吐・下痢）に注意。');
    points.push('QT延長リスク：他のQT延長薬との併用に注意。');
  }
  if (names.some(n => n.includes('アモキシシリン'))) {
    points.push('アモキシシリン：ペニシリン系アレルギーの既往を確認。');
  }
  if (names.some(n => n.includes('アセトアミノフェン'))) {
    points.push('アセトアミノフェン：頓服の間隔は4〜6時間以上あける。');
    points.push('市販の解熱剤との重複投与に注意。');
  }
  if (names.some(n => n.includes('イブプロフェン'))) {
    points.push('NSAIDs：水痘・インフルエンザ疑い時はライ症候群リスクあり。');
  }
  if (meds.length >= 3) {
    points.push('3剤以上の処方：相互作用の組み合わせを確認してください。');
  }
  if (points.length === 0) points.push('特記すべき相互作用・併用注意事項はありません。');
  return points;
}

function deriveCounselingPoints(meds: Medication[], patient: PatientInfo): string[] {
  const age = Number(patient.age);
  const points: string[] = [`${patient.name}さん（${patient.age}歳 / ${patient.weight}kg）の処方です。`];
  if (age < 3) {
    points.push('3歳未満：錠剤は誤嚥リスクあり。粉砕・懸濁法を確認。');
    points.push('保護者への説明：薬の保管・誤飲防止について指導。');
  }
  if (age < 6) {
    points.push('就学前：スポイト・シリンジを使った服薬介助を案内。');
  }
  if (meds.some(m => m.name.includes('シリン') || m.name.includes('マイシン'))) {
    points.push('抗菌薬：症状が改善しても処方日数分を飲みきるよう説明。');
  }
  if (meds.some(m => m.frequency.includes('頓服'))) {
    points.push('頓服薬：使用タイミングと間隔を保護者に明確に説明。');
  }
  points.push('副作用（発疹・嘔吐・呼吸困難）が出たらすぐ受診するよう説明。');
  return points;
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const UNDO_SECONDS = 3;

function UndoToast({ onUndo, onExpire, color }: { onUndo: () => void; onExpire: () => void; color: string }) {
  const [remaining, setRemaining] = useState(UNDO_SECONDS);
  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(iv); onExpire(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-xs w-[calc(100%-2.5rem)]">
      <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">監査完了を記録しました</p>
          <p className="text-gray-400 text-xs mt-0.5">{remaining}秒以内なら取り消せます</p>
        </div>
        <div className="relative w-8 h-8 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="#374151" strokeWidth="3" />
            <circle cx="16" cy="16" r="13" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 13}`}
              strokeDashoffset={`${2 * Math.PI * 13 * (1 - remaining / UNDO_SECONDS)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">{remaining}</span>
        </div>
        <button onClick={onUndo}
          className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0">
          <Undo2 className="w-3.5 h-3.5" />取消
        </button>
      </div>
    </div>
  );
}

function MedAuditCard({ med }: { med: Medication }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[med.status];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(v => !v)}>
        <Icon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{med.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{med.dose} · {med.frequency}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color} bg-white border-2 ${cfg.border} flex-shrink-0`}>{cfg.label}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t-2 border-gray-200 pt-3">
          {med.notes && <p className="text-gray-700 text-xs leading-relaxed">{med.notes}</p>}
          <a href={pmdaUrl(med)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#2196f3] text-xs font-semibold">
            <ExternalLink className="w-3.5 h-3.5" />{med.pmdaLink ? '添付文書を開く（PMDA直リンク）' : '添付文書を検索（PMDA）'}
          </a>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, color, items }: { icon: React.ElementType; title: string; color: string; items: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left" onClick={() => setOpen(v => !v)}>
        <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
        <p className={`font-bold text-sm flex-1 ${color}`}>{title}</p>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <ul className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
              <p className="text-gray-600 text-xs leading-relaxed">{item}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AuditCheckScreen({ imageDataUrl, patientInfo, medications, dispensedAt, onAuditComplete, onBack }: Props) {
  const [pressing, setPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [showUndo, setShowUndo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoRef = useRef(false);

  const interactions = deriveInteractions(medications);
  const counseling = deriveCounselingPoints(medications, patientInfo);
  const dangerCount = medications.filter(m => m.status === 'danger').length;
  const warningCount = medications.filter(m => m.status === 'warning').length;

  const startPress = () => {
    setPressing(true);
    let p = 0;
    timerRef.current = setInterval(() => {
      p += 8;
      setPressProgress(p);
      if (p >= 100) {
        clearInterval(timerRef.current!);
        setPressing(false);
        setPressProgress(0);
        undoRef.current = false;
        setShowUndo(true);
      }
    }, 30);
  };

  const cancelPress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPressing(false);
    setPressProgress(0);
  };

  const handleUndo = () => {
    undoRef.current = true;
    setShowUndo(false);
  };

  const handleUndoExpire = () => {
    if (!undoRef.current) {
      setShowUndo(false);
      onAuditComplete();
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col" style={{ border: '3px solid #f59e0b' }}>
      {/* Header */}
      <div className="bg-amber-500 px-5 pt-12 pb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-amber-100 text-sm mb-3">
          <ChevronRight className="w-4 h-4 rotate-180" />戻る
        </button>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-amber-100 text-xs font-semibold uppercase tracking-wider">監査モード</p>
            <h2 className="text-white text-xl font-bold mt-0.5">監査チェック</h2>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${dangerCount > 0 ? 'bg-red-500/40 text-white' : 'bg-white/20 text-white'}`}>
            {dangerCount > 0 ? <XCircle className="w-3.5 h-3.5" /> : warningCount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {dangerCount > 0 ? '要確認あり' : warningCount > 0 ? '注意あり' : '問題なし'}
          </div>
        </div>
        <div className="bg-white/20 rounded-xl px-3 py-2.5 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-100" />
            <span className="text-white text-sm font-semibold">{patientInfo.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-100" />
            <span className="text-amber-100 text-xs">{patientInfo.age}歳</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-amber-100" />
            <span className="text-amber-100 text-xs">{patientInfo.weight}kg</span>
          </div>
          <span className="ml-auto text-amber-100 text-xs">調剤 {formatTime(dispensedAt)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {imageDataUrl && (
          <div className="bg-white rounded-2xl overflow-hidden border-2 border-amber-200 shadow-sm">
            <p className="px-4 pt-3 pb-2 text-amber-600 text-xs font-bold uppercase tracking-wider">処方箋</p>
            <img src={imageDataUrl} alt="処方箋" className="w-full object-contain max-h-44" />
          </div>
        )}
        <div>
          <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-3 px-1">薬剤チェック（{medications.length}剤）</p>
          <div className="space-y-3">
            {medications.map((med, i) => <MedAuditCard key={i} med={med} />)}
          </div>
        </div>
        <Section icon={AlertTriangle} title="相互作用 / 併用注意" color="text-amber-600" items={interactions} />
        <Section icon={MessageSquare} title="服薬指導 確認項目" color="text-blue-600" items={counseling} />
        <Section icon={BookOpen} title="参考：PMDA添付文書" color="text-gray-600"
          items={medications.map(m => m.pmdaLink ? `${m.name} → 直リンク登録済み（各薬剤カードから開けます）` : `${m.name} → PMDA検索ページ（薬剤名で検索されます）`)} />
        <div className="bg-white rounded-2xl border border-amber-100 p-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            本ツールの情報は参考目的です。最終的な監査・服薬指導判断は薬剤師が行ってください。
          </p>
        </div>
      </div>

      {/* Audit complete button */}
      <div className="px-5 pb-10 pt-4 bg-white border-t-2 border-amber-200">
        <p className="text-center text-amber-600 text-xs font-semibold mb-3">長押しで監査完了を記録（完了後3秒間取り消し可）</p>
        <button
          onMouseDown={startPress} onMouseUp={cancelPress} onMouseLeave={cancelPress}
          onTouchStart={startPress} onTouchEnd={cancelPress}
          className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-200 select-none relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-amber-700 origin-left transition-none"
            style={{ transform: `scaleX(${pressProgress / 100})` }} />
          <ShieldCheck className="w-5 h-5 relative z-10" />
          <span className="relative z-10">
            {pressing ? `長押し中... ${Math.round(pressProgress)}%` : '監査完了'}
          </span>
        </button>
      </div>

      {showUndo && <UndoToast onUndo={handleUndo} onExpire={handleUndoExpire} color="#f59e0b" />}
    </div>
  );
}
