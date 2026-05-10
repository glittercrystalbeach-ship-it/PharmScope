import React, { useState } from 'react';
import './App.css';
import DrugAdditionFlow from './components/DrugAdditionFlow';
import PrescriptionChecker from './components/PrescriptionChecker';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const mobileStyles = {
    app: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      margin: '0',
      padding: '0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#2196f3',
      color: 'white',
      padding: '16px',
      textAlign: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: '0',
      zIndex: '100'
    },
    headerTitle: {
      margin: '0',
      fontSize: '18px',
      fontWeight: 'bold'
    },
    nav: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #eee',
      position: 'sticky',
      top: '56px',
      zIndex: '99'
    },
    navButton: {
      padding: '12px 16px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.3s',
      backgroundColor: '#f0f0f0',
      color: '#333'
    },
    navButtonActive: {
      backgroundColor: '#2196f3',
      color: 'white'
    },
    main: {
      flex: '1',
      overflow: 'auto',
      padding: '0',
      backgroundColor: '#f5f5f5'
    },
    homeContent: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      textAlign: 'center',
      padding: '16px'
    },
    homeTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#2196f3',
      marginBottom: '16px'
    },
    homeText: {
      color: '#666',
      fontSize: '14px',
      lineHeight: '1.6'
    }
  };

  return (
    <div style={mobileStyles.app}>
      <header style={mobileStyles.header}>
        <h1 style={mobileStyles.headerTitle}>PharmScope - 小児処方チェックAI</h1>
      </header>

      <nav style={mobileStyles.nav}>
        <button
          onClick={() => setCurrentPage('home')}
          style={{
            ...mobileStyles.navButton,
            ...(currentPage === 'home' ? mobileStyles.navButtonActive : {})
          }}
        >
          🏠 ホーム
        </button>
        <button
          onClick={() => setCurrentPage('checker')}
          style={{
            ...mobileStyles.navButton,
            ...(currentPage === 'checker' ? mobileStyles.navButtonActive : {})
          }}
        >
          📋 処方箋チェック
        </button>
        <button
          onClick={() => setCurrentPage('addition')}
          style={{
            ...mobileStyles.navButton,
            ...(currentPage === 'addition' ? mobileStyles.navButtonActive : {})
          }}
        >
          ➕ 医薬品追加
        </button>
        <button
          onClick={() => setCurrentPage('admin')}
          style={{
            ...mobileStyles.navButton,
            ...(currentPage === 'admin' ? mobileStyles.navButtonActive : {})
          }}
        >
          ⚙️ 管理者画面
        </button>
      </nav>

      <main style={mobileStyles.main}>
        {currentPage === 'home' && (
          <div style={mobileStyles.homeContent}>
            <h2 style={mobileStyles.homeTitle}>ようこそ PharmScope へ</h2>
            <p style={mobileStyles.homeText}>
              小児処方箋チェック支援 AI<br/>
              安全で効率的な処方監査をサポートします
            </p>
          </div>
        )}
        {currentPage === 'addition' && <DrugAdditionFlow />}
        {currentPage === 'checker' && <PrescriptionChecker />}
        {currentPage === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
}

export default App;
