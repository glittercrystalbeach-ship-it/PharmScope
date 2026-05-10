import React, { useState } from 'react';

const DrugAdditionFlow = () => {
  const [step, setStep] = useState(1);
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>➕ 医薬品追加フロー</h2>
      <p>医薬品追加ページです（実装予定）</p>
      <p>現在のステップ：{step}</p>
    </div>
  );
};

export default DrugAdditionFlow;
