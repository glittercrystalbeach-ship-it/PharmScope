import React, { useState } from 'react';
import './App.css';
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import AnalyzingScreen from './screens/AnalyzingScreen';
import OcrReviewScreen from './screens/OcrReviewScreen';
import PatientInfoScreen from './screens/PatientInfoScreen';
import DispensingScreen from './screens/DispensingScreen';
import DispenseConfirmScreen from './screens/DispenseConfirmScreen';
import AuditCheckScreen from './screens/AuditCheckScreen';
import AuditLogScreen from './screens/AuditLogScreen';
import SettingsScreen from './screens/SettingsScreen';

function App() {
  const [screen, setScreen] = useState('home');
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [ocrMeds, setOcrMeds] = useState([]);
  const [ocrRawText, setOcrRawText] = useState('');
  const [patientInfo, setPatientInfo] = useState({});
  const [medications, setMedications] = useState([]);
  const [dispensedData, setDispensedData] = useState(null);
  const [pharmacySettings, setPharmacySettings] = useState({ pharmacyName: '' });

  const handleScreenChange = (newScreen) => {
    setScreen(newScreen);
  };

  return (
    <div className="app-container">
      {screen === 'home' && (
        <HomeScreen
          onCamera={() => handleScreenChange('camera')}
          onManualInput={() => handleScreenChange('manual-input')}
          onSettings={() => handleScreenChange('settings')}
          pharmacyName={pharmacySettings.pharmacyName}
        />
      )}

      {screen === 'camera' && (
        <CameraScreen
          onCapture={(imageUrl) => {
            setImageDataUrl(imageUrl);
            handleScreenChange('analyzing');
          }}
          onBack={() => handleScreenChange('home')}
        />
      )}

      {screen === 'analyzing' && (
        <AnalyzingScreen
          imageDataUrl={imageDataUrl}
          onComplete={(meds, rawText) => {
            setOcrMeds(meds);
            setOcrRawText(rawText);
            handleScreenChange('ocr-review');
          }}
        />
      )}

      {screen === 'ocr-review' && (
        <OcrReviewScreen
          imageDataUrl={imageDataUrl}
          initialMeds={ocrMeds}
          rawText={ocrRawText}
          onConfirm={() => handleScreenChange('patient-info')}
          onBack={() => handleScreenChange('camera')}
        />
      )}

      {screen === 'patient-info' && (
        <PatientInfoScreen
          ocrMeds={ocrMeds}
          onSubmit={(patInfo) => {
            setPatientInfo(patInfo);
            handleScreenChange('dispensing');
          }}
          onBack={() => handleScreenChange('ocr-review')}
        />
      )}

      {screen === 'dispensing' && (
        <DispensingScreen
          imageDataUrl={imageDataUrl}
          patientInfo={patientInfo}
          medications={medications}
          onDispenseComplete={(dispensed) => {
            setDispensedData(dispensed);
            handleScreenChange('dispense-confirm');
          }}
          onBack={() => setScreen('patient-info' ? 'manual-input' : 'patient-info')}
        />
      )}

      {screen === 'dispense-confirm' && (
        <DispenseConfirmScreen
          patientInfo={patientInfo}
          onBack={() => handleScreenChange('dispensing')}
          onAudit={() => handleScreenChange('audit')}
        />
      )}

      {screen === 'audit' && (
        <AuditCheckScreen
          imageDataUrl={imageDataUrl}
          patientInfo={patientInfo}
          medications={medications}
          dispensedData={dispensedData}
          onAuditComplete={() => handleScreenChange('complete')}
          onBack={() => handleScreenChange('dispense-confirm')}
        />
      )}

      {screen === 'complete' && (
        <CompleteScreen
          patientInfo={patientInfo}
          medications={medications}
          dispensedData={dispensedData}
          auditCompletedAt={new Date()}
          onNext={() => handleScreenChange('audit-log')}
          onViewLog={() => handleScreenChange('audit-log')}
        />
      )}

      {screen === 'audit-log' && (
        <AuditLogScreen
          onBack={() => handleScreenChange('home')}
          onResume={(logData) => handleScreenChange('audit-log')}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          settings={pharmacySettings}
          onSave={(s) => setPharmacySettings(s)}
          onBack={() => handleScreenChange('home')}
        />
      )}

      {screen === 'manual-input' && (
        <div className="hidden">
          <ManualInputScreen
            onManualInput={() => handleScreenChange('home')}
            onDefaultPowderUnit={pharmacySettings.defaultPowderUnit}
          />
        </div>
      )}
    </div>
  );
}

export default App;
