import { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Screen, PatientInfo, OcrMed, Medication, PharmacySettings } from './types';
import { supabase } from './lib/supabase';
import { toInitials } from './utils/initials';
import { buildMedsWithMaster, loadDrugMaster } from './utils/drugMaster';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import AnalyzingScreen from './screens/AnalyzingScreen';
import OcrReviewScreen from './screens/OcrReviewScreen';
import PatientInfoScreen from './screens/PatientInfoScreen';
import DispensingScreen from './screens/DispensingScreen';
import DispenseConfirmScreen from './screens/DispenseConfirmScreen';
import AuditCheckScreen from './screens/AuditCheckScreen';
import CompleteScreen from './screens/CompleteScreen';
import ManualInputScreen from './screens/ManualInputScreen';
import AuditLogScreen, { type ResumeTarget } from './screens/AuditLogScreen';
import SettingsScreen from './screens/SettingsScreen';

const DEFAULT_SETTINGS: PharmacySettings = {
  defaultPowderUnit: 'g',
  pharmacyName: '',
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pharmacySettings, setPharmacySettings] = useState<PharmacySettings>(DEFAULT_SETTINGS);

  const [screen, setScreen] = useState<Screen>('home');
  const prevSessionRef = useRef<Session | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [ocrMeds, setOcrMeds] = useState<OcrMed[]>([]);
  const [ocrRawText, setOcrRawText] = useState('');
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({ name: '', age: '', weight: '' });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [dispensedAt, setDispensedAt] = useState<Date>(new Date());
  const [auditCompletedAt, setAuditCompletedAt] = useState<Date>(new Date());
  const [fromManual, setFromManual] = useState(false);
  // ManualInputScreen は常にマウントして hidden/visible を切り替える（データ保持のため）
  const [manualEverOpened, setManualEverOpened] = useState(false);

  const loadPharmacySettings = async (userId: string) => {
    const { data } = await supabase
      .from('pharmacies')
      .select('name, default_powder_unit')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setPharmacySettings({
        pharmacyName: data.name ?? '',
        defaultPowderUnit: (data.default_powder_unit as 'g' | 'mg') ?? 'g',
      });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      prevSessionRef.current = data.session;
      setSession(data.session);
      setAuthLoading(false);
      if (data.session) {
        loadDrugMaster();
        loadPharmacySettings(data.session.user.id);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // TOKEN_REFRESHED などで一瞬 null が来てもログイン済みユーザーを追い出さない
      if (s === null && prevSessionRef.current !== null && event !== 'SIGNED_OUT') return;
      prevSessionRef.current = s;
      setSession(s);
      if (s) {
        loadDrugMaster();
        loadPharmacySettings(s.user.id);
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Insert new audit log row, return its id
  const createAuditLog = async (info: PatientInfo, meds: Medication[]): Promise<string | null> => {
    if (!session) return null;
    const overall = meds.some(m => m.status === 'danger') ? 'danger'
      : meds.some(m => m.status === 'warning') ? 'warning' : 'safe';
    const { data } = await supabase.from('audit_logs').insert({
      pharmacy_id: session.user.id,
      patient_name: info.name,
      patient_initials: toInitials(info.name),
      patient_age: info.age,
      patient_weight: info.weight,
      drug_count: meds.length,
      overall_status: overall,
      medications: meds,
      workflow_status: 'dispensing',
    }).select('id').maybeSingle();
    return data?.id ?? null;
  };

  const updateDispensed = async (id: string | null) => {
    if (!id) return;
    await supabase.from('audit_logs').update({
      dispensed_at: new Date().toISOString(),
      workflow_status: 'auditing',
    }).eq('id', id);
  };

  const updateAuditComplete = async (id: string | null) => {
    if (!id) return;
    await supabase.from('audit_logs').update({
      audit_completed_at: new Date().toISOString(),
      workflow_status: 'complete',
    }).eq('id', id);
  };

  // --- Handlers ---
  const handleCapture = (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setScreen('analyzing');
  };

  const handleAnalysisComplete = (meds: OcrMed[], rawText: string) => {
    setOcrMeds(meds);
    setOcrRawText(rawText);
    setScreen('ocr-review');
  };

  const handleOcrConfirm = (confirmedMeds: OcrMed[]) => {
    setOcrMeds(confirmedMeds);
    setScreen('patient-info');
  };

  const handlePatientSubmit = async (info: PatientInfo) => {
    setPatientInfo(info);
    const meds = await buildMedsWithMaster(ocrMeds, info);
    setMedications(meds);
    const id = await createAuditLog(info, meds);
    setCurrentLogId(id);
    setScreen('dispensing');
  };

  const handleDispenseComplete = async () => {
    const now = new Date();
    setDispensedAt(now);
    await updateDispensed(currentLogId);
    setScreen('dispense-confirm');
  };

  const handleAuditDone = async () => {
    const now = new Date();
    setAuditCompletedAt(now);
    // Ensure dispensed_at is also recorded when skipping the audit screen
    if (!currentLogId) { setScreen('complete'); return; }
    await supabase.from('audit_logs').update({
      dispensed_at: dispensedAt.toISOString(),
      audit_completed_at: now.toISOString(),
      workflow_status: 'complete',
    }).eq('id', currentLogId);
    setScreen('complete');
  };

  const handleAuditComplete = async () => {
    const now = new Date();
    setAuditCompletedAt(now);
    await updateAuditComplete(currentLogId);
    setScreen('complete');
  };

  const handleManualResult = async (info: PatientInfo, meds: Medication[]) => {
    setPatientInfo(info);
    setMedications(meds);
    setImageDataUrl('');
    setOcrMeds([]);
    setFromManual(true);
    const id = await createAuditLog(info, meds);
    setCurrentLogId(id);
    setScreen('dispensing');
  };

  const handleManualOpen = () => {
    setManualEverOpened(true);
    setScreen('manual-input');
  };

  const handleResumeFromLog = (target: ResumeTarget) => {
    setPatientInfo({ name: target.patientName, age: target.patientAge, weight: target.patientWeight });
    setMedications(target.medications);
    setCurrentLogId(target.logId);
    setImageDataUrl('');
    setFromManual(false);
    setScreen(target.screen === 'audit' ? 'audit' : 'dispensing');
  };

  const handleRestart = () => {
    setImageDataUrl('');
    setOcrMeds([]);
    setOcrRawText('');
    setPatientInfo({ name: '', age: '', weight: '' });
    setMedications([]);
    setCurrentLogId(null);
    setFromManual(false);
    setManualEverOpened(false);
    setScreen('home');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#2196f3]/30 border-t-[#2196f3] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto">
        <LoginScreen onLogin={() => setScreen('home')} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto relative">
      {screen === 'home' && (
        <HomeScreen
          onCamera={() => setScreen('camera')}
          onManual={handleManualOpen}
          onAudit={() => setScreen('audit-log')}
          onSettings={() => setScreen('settings')}
          pharmacyName={pharmacySettings.pharmacyName}
        />
      )}
      {screen === 'camera' && (
        <CameraScreen onCapture={handleCapture} onBack={() => setScreen('home')} />
      )}
      {screen === 'analyzing' && (
        <AnalyzingScreen imageDataUrl={imageDataUrl} onComplete={handleAnalysisComplete} />
      )}
      {screen === 'ocr-review' && (
        <OcrReviewScreen imageDataUrl={imageDataUrl} initialMeds={ocrMeds} rawText={ocrRawText}
          onConfirm={handleOcrConfirm} onBack={() => setScreen('camera')} />
      )}
      {screen === 'patient-info' && (
        <PatientInfoScreen ocrMeds={ocrMeds} onSubmit={handlePatientSubmit} onBack={() => setScreen('ocr-review')} />
      )}
      {screen === 'dispensing' && (
        <DispensingScreen imageDataUrl={imageDataUrl} patientInfo={patientInfo} medications={medications}
          onDispenseComplete={handleDispenseComplete}
          onBack={() => setScreen(fromManual ? 'manual-input' : 'patient-info')} />
      )}
      {screen === 'dispense-confirm' && (
        <DispenseConfirmScreen
          patientInfo={patientInfo}
          onBack={() => setScreen('dispensing')}
          onAudit={() => setScreen('audit')}
          onAuditDone={handleAuditDone}
        />
      )}
      {screen === 'audit' && (
        <AuditCheckScreen imageDataUrl={imageDataUrl} patientInfo={patientInfo} medications={medications}
          dispensedAt={dispensedAt} onAuditComplete={handleAuditComplete} onBack={() => setScreen('dispensing')} />
      )}
      {screen === 'complete' && (
        <CompleteScreen patientInfo={patientInfo} medications={medications}
          dispensedAt={dispensedAt} auditCompletedAt={auditCompletedAt}
          onNext={handleRestart} onViewLog={() => setScreen('audit-log')} />
      )}
      {/* ManualInputScreen は一度開いたら常時マウント（データ保持）。hidden で表示切替 */}
      {manualEverOpened && (
        <div className={screen === 'manual-input' ? '' : 'hidden'}>
          <ManualInputScreen
            onResult={handleManualResult}
            onBack={() => setScreen('home')}
            defaultPowderUnit={pharmacySettings.defaultPowderUnit}
          />
        </div>
      )}
      {screen === 'audit-log' && (
        <AuditLogScreen onBack={() => setScreen('home')} onResume={handleResumeFromLog} />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          settings={pharmacySettings}
          onSave={s => setPharmacySettings(s)}
          onBack={() => setScreen('home')}
        />
      )}
    </div>
  );
}
