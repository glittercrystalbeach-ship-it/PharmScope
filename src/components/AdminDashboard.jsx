import React, { useState } from 'react';

const AdminDashboard = () => {
  const [pending, setPending] = useState([]);
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>⚙️ 管理者画面</h2>
      <p>管理者画面ページです（実装予定）</p>
      <p>待機中の医薬品：{pending.length}件</p>
    </div>
  );
};

export default AdminDashboard;
