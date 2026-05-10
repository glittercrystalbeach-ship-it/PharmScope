import { useEffect, useState, useMemo, useRef } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, User, Clock, Shield, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Medication } from '../types';

interface LogEntry {
  id: string;
  patient_name: string;
  patient_initials: string;
  patient_age: string;
  patient_weight: string;
  drug_count: number;
  overall_status: 'safe' | 'warning' | 'danger';
  medications: Medication[];
  checked_at: string;
  dispensed_at: string | null;
  audit_completed_at: string | null;
  workflow_status: 'dispensing' | 'auditing' | 'complete';
}

interface ResumeTarget {
  logId: string;
  patientName: string;
  patientAge: string;
  patientWeight: string;
  medications: Medication[];
  screen: 'dispensing' | 'audit';
}

interface Props {
  onBack: () => void;
  onResume?: (target: ResumeTarget) => void;
}

export type { ResumeTarget };

const JST_OFFSET = 9 * 60; // minutes

function toJSTDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getTime() + JST_OFFSET * 60 * 1000);
}

// Returns "YYYY-MM-DD" in JST
function jstDateKey(iso: string): string {
  const d = toJSTDate(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function todayJSTKey(): string {
  return jstDateKey(new Date().toISOString());
}

function formatDateLabel(key: string): string {
  const [y, m, d] = key.split('-');
  const date = new Date(`${y}-${m}-${d}T00:00:00+09:00`);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${y}年${parseInt(m)}月${parseInt(d)}日（${days[date.getDay()]}）`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = toJSTDate(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

const statusConfig = {
  safe: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: '安全', border: 'border-green-100' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: '注意', border: 'border-amber-100' },
  danger: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: '要確認', border: 'border-red-100' },
};

const workflowConfig = {
  dispensing: { label: '調剤中', color: 'text-[#2196f3]', bg: 'bg-blue-50', border: 'border-blue-200' },
  auditing: { label: '監査中', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  complete: { label: '完了', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
};

function LogCard({ log, onResume }: { log: LogEntry; onResume?: (target: ResumeTarget) => void }) {
  const [expanded, setExpanded] = useState(false);
  const lastTapRef = useRef<number>(0);
  const cfg = statusConfig[log.overall_status];
  const wf = workflowConfig[log.workflow_status];
  const Icon = cfg.icon;
  const displayName = log.patient_name || log.patient_initials;

  const canResume = log.workflow_status === 'dispensing' || log.workflow_status === 'auditing';

  const handleDetailTap = () => {
    if (!expanded || !canResume || !onResume) return;
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      // ダブルタップ
      onResume({
        logId: log.id,
        patientName: log.patient_name,
        patientAge: log.patient_age,
        patientWeight: log.patient_weight,
        medications: log.medications,
        screen: log.workflow_status === 'auditing' ? 'audit' : 'dispensing',
      });
    }
    lastTapRef.current = now;
  };

  return (
    <div className={`bg-white rounded-2xl border ${cfg.border} shadow-sm overflow-hidden`}>
      <button className="w-full flex items-center gap-3 p-4 text-left active:scale-[0.98] transition-transform"
        onClick={() => setExpanded(v => !v)}>
        <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-800 text-sm">{displayName}</p>
            <span className="text-gray-400 text-xs">{log.patient_age}歳 / {log.patient_weight}kg</span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            {formatTime(log.checked_at)} · {log.drug_count}剤
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${wf.bg} ${wf.color} ${wf.border}`}>{wf.label}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-300 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-300 ml-1" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3" onClick={handleDetailTap}>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Clock className="w-3 h-3 text-[#2196f3]" />
                <p className="text-[#2196f3] text-xs font-semibold">調剤完了</p>
              </div>
              <p className="text-gray-700 text-xs font-bold">{formatTime(log.dispensed_at)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Shield className="w-3 h-3 text-amber-500" />
                <p className="text-amber-600 text-xs font-semibold">監査完了</p>
              </div>
              <p className="text-gray-700 text-xs font-bold">{formatTime(log.audit_completed_at)}</p>
            </div>
          </div>

          {log.medications.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">処方薬剤</p>
              <div className="space-y-1.5">
                {log.medications.map((m, i) => {
                  const mc = statusConfig[m.status];
                  const MI = mc.icon;
                  return (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${mc.bg} border ${mc.border}`}>
                      <MI className={`w-3.5 h-3.5 ${mc.color} flex-shrink-0`} />
                      <p className="text-gray-700 text-xs font-medium flex-1 truncate">{m.name}</p>
                      <p className="text-gray-500 text-xs flex-shrink-0">{m.dose}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {canResume && onResume && (
            <div className={`rounded-xl px-3 py-2.5 border text-center ${
              log.workflow_status === 'auditing'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-xs font-bold ${log.workflow_status === 'auditing' ? 'text-amber-600' : 'text-[#2196f3]'}`}>
                ダブルタップで{log.workflow_status === 'auditing' ? '監査画面' : '調剤画面'}に戻る
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditLogScreen({ onBack, onResume }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayJSTKey());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(200);
      setLogs((data as LogEntry[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // All unique dates that have records, sorted descending
  const availableDates = useMemo(() => {
    const keys = new Set(logs.map(l => jstDateKey(l.checked_at)));
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [logs]);

  // Ensure selectedDate is valid once data loads; fallback to today
  useEffect(() => {
    if (!loading && availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [loading, availableDates, selectedDate]);

  const dayLogs = useMemo(
    () => logs.filter(l => jstDateKey(l.checked_at) === selectedDate),
    [logs, selectedDate]
  );

  const currentIdx = availableDates.indexOf(selectedDate);
  const canPrev = currentIdx < availableDates.length - 1; // older
  const canNext = currentIdx > 0; // newer

  const goNext = () => { if (canNext) setSelectedDate(availableDates[currentIdx - 1]); };
  const goPrev = () => { if (canPrev) setSelectedDate(availableDates[currentIdx + 1]); };

  const safeCount = dayLogs.filter(l => l.overall_status === 'safe').length;
  const warnCount = dayLogs.filter(l => l.overall_status === 'warning').length;
  const dangerCount = dayLogs.filter(l => l.overall_status === 'danger').length;
  const completeCount = dayLogs.filter(l => l.workflow_status === 'complete').length;

  const isToday = selectedDate === todayJSTKey();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#2196f3] px-5 pt-12 pb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-white/80 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" />戻る
        </button>
        <h2 className="text-white text-xl font-bold">調剤 / 監査記録</h2>
        <p className="text-blue-100 text-xs mt-0.5">当薬局のチェック・調剤・監査履歴</p>
      </div>

      {/* Date navigator */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <button
          onClick={goPrev}
          disabled={!canPrev}
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center disabled:opacity-30 active:bg-gray-50 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#2196f3]" />
            <p className="text-gray-800 font-bold text-sm">
              {loading ? '読み込み中...' : availableDates.length === 0 ? '記録なし' : formatDateLabel(selectedDate)}
            </p>
          </div>
          {isToday && !loading && (
            <p className="text-[#2196f3] text-xs font-semibold mt-0.5">今日</p>
          )}
        </div>

        <button
          onClick={goNext}
          disabled={!canNext}
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center disabled:opacity-30 active:bg-gray-50 transition-colors flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Privacy notice */}
      <div className="mx-5 mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2">
        <User className="w-4 h-4 text-[#2196f3] mt-0.5 flex-shrink-0" />
        <p className="text-blue-700 text-xs leading-relaxed">
          患者情報はこの薬局のみ閲覧できます。他の薬局からはアクセスできません。
        </p>
      </div>

      {/* Daily summary */}
      {!loading && dayLogs.length > 0 && (
        <div className="px-5 pt-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">本日の統計 — {dayLogs.length}件</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-xl font-bold text-green-500">{safeCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">安全</p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-xl font-bold text-amber-500">{warnCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">注意</p>
              </div>
              <div className="text-center border-r border-gray-100">
                <p className="text-xl font-bold text-red-500">{dangerCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">要確認</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#2196f3]">{completeCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">完了</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log list */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 space-y-3">
        {!loading && dayLogs.length > 0 && (
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-1">履歴（タップで詳細）</p>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#2196f3]/30 border-t-[#2196f3] rounded-full animate-spin" />
          </div>
        )}

        {!loading && availableDates.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">まだ記録がありません</p>
          </div>
        )}

        {!loading && availableDates.length > 0 && dayLogs.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm font-semibold">この日の記録はありません</p>
            <p className="text-gray-400 text-xs mt-1">左右の矢印で日付を移動できます</p>
          </div>
        )}

        {!loading && dayLogs.map(log => <LogCard key={log.id} log={log} onResume={onResume} />)}
      </div>
    </div>
  );
}
