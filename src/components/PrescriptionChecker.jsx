import React, { useState } from 'react';

const PrescriptionChecker = () => {
  const [step, setStep] = useState('capture');

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>📋 処方箋チェック</h2>
      <p>処方箋チェック機能（準備中）</p>
      <button onClick={() => alert('カメラ機能は準備中です')} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        📸 撮影
      </button>
    </div>
  );
};

export default PrescriptionChecker;
