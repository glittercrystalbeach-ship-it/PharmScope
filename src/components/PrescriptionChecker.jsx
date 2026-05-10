import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';

const PrescriptionChecker = () => {
  const [step, setStep] = useState('capture');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    weight: ''
  });

  useEffect(() => {
    if (step === 'capture') {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      }).then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }).catch(err => {
        console.error('カメラエラー:', err);
        alert('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。');
      });
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvasRef.current.toDataURL('image/jpeg'));
    setStep('ocr_processing');
  };

  const handleOCRProcess = async () => {
    setLoading(true);
    setOcrProgress(0);
    try {
      const { data } = await Tesseract.recognize(capturedImage, 'jpx', {
        logger: (m) => {
          if (m.status === 'recognizing') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const fullText = data.text;
      const nameMatch = fullText.match(/患者(?:名|氏名)[\s：:]*([^\n,、。]+)/);
      const ageMatch = fullText.match(/(?:年齢|年|歳)[\s：:]*(\d+)/);

      setOcrResult({
        fullText,
        extractedName: nameMatch ? nameMatch[1].trim() : '',
        extractedAge: ageMatch ? ageMatch[1] : '',
        confidence: (data.confidence || 0).toFixed(1)
      });

      setPatientInfo({
        name: nameMatch ? nameMatch[1].trim() : '',
        age: ageMatch ? ageMatch[1] : '',
        weight: ''
      });

      setStep('confirm');
    } catch (err) {
      console.error('OCRエラー:', err);
      alert('OCR解析に失敗しました。もう一度試してください。');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'capture') {
    return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative', margin: 0, padding: 0, overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* ガイドライン（黄色） */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {/* 上下左右の暗くした領域 */}
          <rect x="0" y="0" width="100%" height="15%" fill="rgba(0,0,0,0.4)" />
          <rect x="0" y="85%" width="100%" height="15%" fill="rgba(0,0,0,0.4)" />
          <rect x="0" y="0" width="10%" height="100%" fill="rgba(0,0,0,0.4)" />
          <rect x="90%" y="0" width="10%" height="100%" fill="rgba(0,0,0,0.4)" />

          {/* 処方箋ガイド枠（黄色、太い枠線） */}
          <rect 
            x="10%" 
            y="15%" 
            width="80%" 
            height="70%" 
            fill="none" 
            stroke="#FFD700" 
            strokeWidth="4"
            strokeDasharray="10,10"
          />

          {/* 四隅の強調マーカー（黄色） */}
          {/* 左上 */}
          <line x1="10%" y1="15%" x2="20%" y2="15%" stroke="#FFD700" strokeWidth="3" />
          <line x1="10%" y1="15%" x2="10%" y2="25%" stroke="#FFD700" strokeWidth="3" />
          
          {/* 右上 */}
          <line x1="90%" y1="15%" x2="80%" y2="15%" stroke="#FFD700" strokeWidth="3" />
          <line x1="90%" y1="15%" x2="90%" y2="25%" stroke="#FFD700" strokeWidth="3" />
          
          {/* 左下 */}
          <line x1="10%" y1="85%" x2="20%" y2="85%" stroke="#FFD700" strokeWidth="3" />
          <line x1="10%" y1="85%" x2="10%" y2="75%" stroke="#FFD700" strokeWidth="3" />
          
          {/* 右下 */}
          <line x1="90%" y1="85%" x2="80%" y2="85%" stroke="#FFD700" strokeWidth="3" />
          <line x1="90%" y1="85%" x2="90%" y2="75%" stroke="#FFD700" strokeWidth="3" />

          {/* ガイドテキスト */}
          <text x="50%" y="92%" textAnchor="middle" fill="#FFD700" fontSize="20" fontWeight="bold" style={{ textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
            ✓ 処方箋を枠内に配置してください
          </text>
        </svg>

        {/* 撮影ボタン */}
        <button 
          onClick={handleCapture}
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '16px 40px',
            fontSize: '18px',
            fontWeight: 'bold',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            zIndex: 100,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        >
          📸 撮影
        </button>
      </div>
    );
  }

  if (step === 'ocr_processing') {
    return (
      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#2196f3', color: 'white', padding: '16px', textAlign: 'center', borderRadius: '8px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>⚙️ OCR 解析中</h2>
        </div>
        {capturedImage && <img src={capturedImage} alt="撮影画像" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }} />}
        <div style={{ width: '100%', height: '8px', backgroundColor: '#eee', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ height: '100%', width: `${ocrProgress}%`, backgroundColor: '#2196f3', transition: 'width 0.3s' }} />
        </div>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '16px' }}>{ocrProgress}%</p>
        <button 
          onClick={handleOCRProcess} 
          disabled={loading}
          style={{ width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          {loading ? '⏳ 処理中...' : '🚀 OCR 実行'}
        </button>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#2196f3', color: 'white', padding: '16px', textAlign: 'center', borderRadius: '8px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>👤 患者情報確認</h2>
        </div>
        {capturedImage && <img src={capturedImage} alt="撮影画像" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }} />}
        
        <div style={{ marginBottom: '16px', backgroundColor: 'white', padding: '12px', borderRadius: '8px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>患者名：</label>
          <input
            type="text"
            value={patientInfo.name}
            onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
            placeholder="山田太郎"
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px', backgroundColor: 'white', padding: '12px', borderRadius: '8px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>年齢：</label>
          <input
            type="number"
            value={patientInfo.age}
            onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
            placeholder="35"
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px', backgroundColor: 'white', padding: '12px', borderRadius: '8px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>体重（kg）：</label>
          <input
            type="number"
            value={patientInfo.weight}
            onChange={(e) => setPatientInfo({ ...patientInfo, weight: e.target.value })}
            placeholder="65.5"
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px', boxSizing: 'border-box' }}
          />
        </div>

        {ocrResult && (
          <div style={{ backgroundColor: '#e3f2fd', border: '1px solid #2196f3', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            <strong>📊 OCR 信頼度：{ocrResult.confidence}%</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => { setStep('capture'); setCapturedImage(null); }}
            style={{ flex: 1, padding: '10px', backgroundColor: '#999', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            ← 再撮影
          </button>
          <button
            onClick={() => alert('チェック結果を送信します\n患者名: ' + patientInfo.name + '\n年齢: ' + patientInfo.age + '歳\n体重: ' + patientInfo.weight + 'kg')}
            style={{ flex: 1, padding: '10px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            ✓ 確認
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PrescriptionChecker;
