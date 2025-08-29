import React, { useState, useEffect } from 'react';
import { Container, Content, Sidebar, Button, Form, Input } from 'rsuite';
import { useLocation, matchPath, useNavigate, Routes, Route } from 'react-router-dom';
import WordsRegister from './pages/words-register';
import WordsTable from './pages/words-table';
import WordsSearch from './pages/words-search';
import WordAnalysis from './pages/word-analysis';
import ExamplesRegister from './pages/examples-register';
import ExamplesTable from './pages/examples-table';
import Quiz from './pages/quiz';
import UserManagement from './pages/user-management';
import UserDetail from './pages/user-detail';
import AuthUserProfile from './components/AuthUserProfile';
import { useUser } from './contexts/UserContext';
import './App.css';
import 'rsuite/dist/rsuite.min.css';

function App() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItemsAdmin = [
    {
      key: 'words-register',
      label: '단어 등록',
      path: '/words-register',
    },
    {
      key: 'words-table',
      label: '단어 관리',
      path: '/words-table'
    },
    {
      key: 'examples-register',
      label: '예문 등록',
      path: '/examples-register'
    },
    {
      key: 'examples-table',
      label: '예문 관리',
      path: '/examples-table'
    },
    {
      key: 'user-management',
      label: '사용자 관리',
      path: '/user-management'
    }
  ];
  
  const menuItemsUser = [
    {
      key: 'words-search',
      label: '단어 검색',
      path: '/words-search'
    }
  ];

  const menuItemsPublic = [
    {
      key: 'word-analysis',
      label: '단어 분석',
      path: '/'
    }
  ];

  const menuItems = [...menuItemsAdmin, ...menuItemsUser, ...menuItemsPublic];

  const handleMenuSelect = (key) => {
    const menuItem = menuItems.find(item => item.key === key);
    if (menuItem) {
      navigate(menuItem.path);
      setIsMobileMenuOpen(false); // 모바일 메뉴 선택 시 닫기
    }
  };

  const getActiveKey = () => {
    const currentPath = location.pathname;
    const activeItem = menuItems.find(item => 
      currentPath === item.path || currentPath.startsWith(item.path)
    );
    return activeItem ? activeItem.key : 'words-register';
  };

  const renderMenuButtons = () => (
    <div className="menu-container">
      {menuItemsPublic.map(item => (
        <Button
          key={item.key}
          appearance={getActiveKey() === item.key ? 'primary' : 'ghost'}
          block
          onClick={() => handleMenuSelect(item.key)}
          className="menu-button"
        >
          {item.label}
        </Button>
      ))}
      {user && (user.roles.includes('user') || user.roles.includes('admin')) && menuItemsUser.map(item => (
        <Button
          key={item.key}
          appearance={getActiveKey() === item.key ? 'primary' : 'ghost'}
          block
          onClick={() => handleMenuSelect(item.key)}
          className="menu-button"
        >
          {item.label}
        </Button>
      ))}
      {user && (user.roles.includes('admin')) && menuItemsAdmin.map(item => (
        <Button
          key={item.key}
          appearance={getActiveKey() === item.key ? 'primary' : 'ghost'}
          block
          onClick={() => handleMenuSelect(item.key)}
          className="menu-button"
        >
          {item.label}
        </Button>
      ))}


    </div>
  );

  return (
    <>
      {/* 모바일 헤더 */}
      <div className="mobile">
        <div className="mobile-header">
          <img 
            src="/onigiri.jpg" 
            alt="Onigiri" 
            className="mobile-logo" 
            onClick={() => navigate('/')}
          />
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            ☰
          </button>
        </div>

        {/* 모바일 메뉴 오버레이 */}
        <div 
          className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* 모바일 메뉴 패널 */}
        <div className={`mobile-menu-panel ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-header">
            <img 
              src="/onigiri.jpg" 
              alt="Onigiri" 
              className="mobile-logo" 
              onClick={() => navigate('/')}
            />
            <button 
              className="mobile-menu-close"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="sidebar-content">
            <AuthUserProfile />
            {renderMenuButtons()}
          </div>
        </div>
        </div>

      <Container className="app-container">
        <Sidebar className="sidebar">
          <div className="sidebar-content">
            <img 
              src="/onigiri.jpg" 
              alt="Onigiri" 
              className="logo-image" 
              onClick={() => navigate('/')}
            />
            <AuthUserProfile />
            {renderMenuButtons()}
          </div>
        </Sidebar>
        <Content className="content-area">
          <Routes>
            <Route path="/" element={<WordAnalysis />} />
            <Route path="/words-search" element={<WordsSearch />} />              
            <Route path="/words-register" element={<WordsRegister />} />
            <Route path="/words-table" element={<WordsTable />} />
            <Route path="/examples-register" element={<ExamplesRegister />} />
            <Route path="/examples-table" element={<ExamplesTable />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/user-detail/:userId" element={<UserDetail />} />
            <Route path="/quiz" element={<Quiz />} />
          </Routes>
        </Content>
      </Container>
    </>
  );
}

export default App;





