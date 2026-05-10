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
      const medicineMatches = fullText.match(/([^\n]{2,10})[\s：:]*(\d+[\.\d]*)\s*(?:mg|g|ml|個|錠|㎎|㎏)/g);

      setOcrResult({
        fullText,
        extractedName: nameMatch ? nameMatch[1].trim() : '',
        extractedAge: ageMatch ? ageMatch[1] : '',
        medicines: medicineMatches || [],
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

  const mobileStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      overflow: 'auto',
      padding: '0',
      margin: '0'
    },
    header: {
      backgroundColor: '#2196f3',
      color: 'white',
      padding: '16px',
      textAlign: 'center',
      position: 'sticky',
      top: '0',
      zIndex: '10'
    },
    headerTitle: {
      margin: '0',
      fontSize: '18px',
      fontWeight: 'bold'
    },
    content: {
      flex: '1',
      padding: '16px',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    },
    videoContainer: {
      width: '100%',
      aspectRatio: '3/4',
      backgroundColor: '#000',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px'
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    button: {
      padding: '12px 16px',
      fontSize: '16px',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.3s',
      width: '100%',
      marginBottom: '8px'
    },
    primaryButton: {
      backgroundColor: '#2196f3',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#999',
      color: 'white'
    },
    formGroup: {
      marginBottom: '16px',
      backgroundColor: 'white',
      padding: '12px',
      borderRadius: '8px'
    },
    label: {
      display: 'block',
      fontWeight: 'bold',
      marginBottom: '8px',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '16px',
      boxSizing: 'border-box'
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#eee',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '8px'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#2196f3',
      transition: 'width 0.3s'
    },
    previewImage: {
      width: '100%',
      maxWidth: '100%',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    infoBox: {
      backgroundColor: '#e3f2fd',
      border: '1px solid #2196f3',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
      marginTop: '16px'
    }
  };

  if (step === 'capture') {
    return (
      <div style={mobileStyles.container}>
        <div style={mobileStyles.header}>
          <h2 style={mobileStyles.headerTitle}>📷 処方箋撮影</h2>
        </div>
        <div style={mobileStyles.content}>
          <p style={{ textAlign: 'center', color: '#666' }}>処方箋をカメラで撮影してください</p>
          <div style={mobileStyles.videoContainer}>
            <video ref={videoRef} autoPlay playsInline style={mobileStyles.video} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          <button onClick={handleCapture} style={{ ...mobileStyles.button, ...mobileStyles.primaryButton }}>
            📸 撮影
          </button>
        </div>
      </div>
    );
  }

  if (step === 'ocr_processing') {
    return (
      <div style={mobileStyles.container}>
        <div style={mobileStyles.header}>
          <h2 style={mobileStyles.headerTitle}>⚙️ OCR 解析中</h2>
        </div>
        <div style={mobileStyles.content}>
          {capturedImage && <img src={capturedImage} alt="撮影画像" style={mobileStyles.previewImage} />}
          <div style={mobileStyles.progressBar}>
            <div style={{ ...mobileStyles.progressFill, width: `${ocrProgress}%` }} />
          </div>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '16px' }}>{ocrProgress}%</p>
          <button onClick={handleOCRProcess} disabled={loading} style={{ ...mobileStyles.button, ...mobileStyles.primaryButton }}>
            {loading ? '⏳ 処理中...' : '🚀 OCR 実行'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div style={mobileStyles.container}>
        <div style={mobileStyles.header}>
          <h2 style={mobileStyles.headerTitle}>👤 患者情報確認</h2>
        </div>
        <div style={mobileStyles.content}>
          {capturedImage && <img src={capturedImage} alt="撮影画像" style={mobileStyles.previewImage} />}
          
          <div style={mobileStyles.formGroup}>
            <label style={mobileStyles.label}>患者名：</label>
            <input
              type="text"
              value={patientInfo.name}
              onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
              placeholder="山田太郎"
              style={mobileStyles.input}
            />
          </div>

          <div style={mobileStyles.formGroup}>
            <label style={mobileStyles.label}>年齢：</label>
            <input
              type="number"
              value={patientInfo.age}
              onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
              placeholder="35"
              style={mobileStyles.input}
            />
          </div>

          <div style={mobileStyles.formGroup}>
            <label style={mobileStyles.label}>体重（kg）：</label>
            <input
              type="number"
              value={patientInfo.weight}
              onChange={(e) => setPatientInfo({ ...patientInfo, weight: e.target.value })}
              placeholder="65.5"
              style={mobileStyles.input}
            />
          </div>

          {ocrResult && (
            <div style={mobileStyles.infoBox}>
              <strong>📊 OCR 信頼度：{ocrResult.confidence}%</strong>
              {ocrResult.medicines.length > 0 && (
                <div>
                  <strong>検出医薬品：</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {ocrResult.medicines.map((med, idx) => (
                      <li key={idx}>{med}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div style={mobileStyles.buttonGroup}>
            <button
              onClick={() => { setStep('capture'); setCapturedImage(null); }}
              style={{ ...mobileStyles.button, ...mobileStyles.secondaryButton, flex: 1 }}
            >
              ← 再撮影
            </button>
            <button
              onClick={() => alert('チェック結果を送信します\n患者名: ' + patientInfo.name + '\n年齢: ' + patientInfo.age + '歳\n体重: ' + patientInfo.weight + 'kg')}
              style={{ ...mobileStyles.button, ...mobileStyles.primaryButton, flex: 1 }}
            >
              ✓ 確認
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PrescriptionChecker;
