import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { messiHello, settingsList, settingsDetail } from '../api.js';
import './HelloMessi.css';

const HelloMessi = () => {
  const navigate = useNavigate();
  
  // Messi Hello 기능 관련 상태
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings 기능 관련 상태
  const [settingsOptions, setSettingsOptions] = useState([]);
  const [selectedSettings, setSelectedSettings] = useState([]);
  const [settingsDetails, setSettingsDetails] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // 컴포넌트 마운트 시 settings 목록 가져오기
  useEffect(() => {
    fetchSettingsList();
  }, []);

  // Messi Hello API 호출
  const handleMessiHello = async () => {
    if (!name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await messiHello(name);
      setMessage(response.data.message);
    } catch (error) {
      console.error('Messi Hello API 오류:', error);
      setMessage('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Settings 목록 가져오기
  const fetchSettingsList = async () => {
    try {
      const response = await settingsList();
      setSettingsOptions(response.data);
    } catch (error) {
      console.error('Settings List API 오류:', error);
    }
  };

  // Settings 체크박스 변경 처리
  const handleSettingChange = (settingName) => {
    setSelectedSettings(prev => {
      if (prev.includes(settingName)) {
        return prev.filter(name => name !== settingName);
      } else {
        return [...prev, settingName];
      }
    });
  };

  // Settings Detail API 호출
  const handleGetSettingsDetails = async () => {
    if (selectedSettings.length === 0) {
      alert('설정을 하나 이상 선택해주세요.');
      return;
    }

    setSettingsLoading(true);
    try {
      const response = await settingsDetail(selectedSettings);
      setSettingsDetails(response.data);
    } catch (error) {
      console.error('Settings Detail API 오류:', error);
      setSettingsDetails([]);
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="hello-messi-container">
      <h1>Hello Messi 페이지</h1>
      
      {/* Navigation */}
      <div className="navigation-section">
        <button 
          onClick={() => navigate('/users')}
          className="nav-btn"
        >
          사용자 관리 페이지로 이동
        </button>
      </div>
      
      {/* Messi Hello 기능 */}
      <div className="section">
        <h2>1. Messi Hello 기능</h2>
        <div className="input-group">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="name-input"
          />
          <button 
            onClick={handleMessiHello}
            disabled={loading}
            className="submit-btn"
          >
            {loading ? '전송 중...' : '전송'}
          </button>
        </div>
        {message && (
          <div className="message-display">
            <strong>응답:</strong> {message}
          </div>
        )}
      </div>

      {/* Settings 기능 */}
      <div className="section">
        <h2>2. Settings 기능</h2>
        <div className="settings-list">
          <h3>설정 목록:</h3>
          {settingsOptions.map((setting) => (
            <label key={setting} className="setting-item">
              <input
                type="checkbox"
                checked={selectedSettings.includes(setting)}
                onChange={() => handleSettingChange(setting)}
              />
              {setting}
            </label>
          ))}
        </div>
        
        <button 
          onClick={handleGetSettingsDetails}
          disabled={settingsLoading || selectedSettings.length === 0}
          className="submit-btn"
        >
          {settingsLoading ? '로딩 중...' : '선택된 설정 상세보기'}
        </button>

        {settingsDetails.length > 0 && (
          <div className="settings-details">
            <h3>설정 상세 정보:</h3>
            <div className="details-list">
              {selectedSettings.map((setting, index) => (
                <div key={setting} className="detail-item">
                  <strong>{setting}:</strong> {JSON.stringify(settingsDetails[index])}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelloMessi;
