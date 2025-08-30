import React, { useState } from 'react';
import EditableTable from '../EditableTable';
import { usersUpsert } from '../../api.js';
import './UserRegister.css';

const UserRegister = () => {
  const [users, setUsers] = useState([]);
  const [overlappedUsers, setOverlappedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // 테이블 컬럼 정의 - DB의 실제 Words 테이블 구조 반영
  const columns = [
    {
      key: 'display_name',
      label: '표시명'
    },
    {
      key: 'email',
      label: '이메일'
    },
    {
      key: 'picture_url',
      label: '프로필 이미지'
    },
  ];

  // 데이터 변경 핸들러
  const handleDataChange = (newData) => {
    setUsers(newData);
  };

  // 사용자 등록 처리
  const handleSubmit = async () => {
    if (users.length === 0) {
      setMessage('등록할 사용자가 없습니다.');
      return;
    }

    // 빈 행 필터링
    const validUsers = users.filter(user => 
      user.display_name && user.email && user.picture_url
    );

    if (validUsers.length === 0) {
      setMessage('모든 필드를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      // 백엔드가 기대하는 형식으로 데이터 전송 (users 배열을 직접 전송)
      const response = await usersUpsert(validUsers);

      
      if (response.status === 200 || response.status === 201) {
        const created = response.data["inserted"]
        const duplicates = response.data["duplicates"]
        if (duplicates.length > 0) {
          setOverlappedUsers(duplicates)
          setMessage(`중복되는 사용자 ${duplicates.length}개를 제외하고 성공적으로 등록되었습니다.`);
        } else {
          setOverlappedUsers([])
          setMessage(`${created.length}개의 사용자가 성공적으로 등록되었습니다.`);
        }
        setUsers(duplicates); // 중복사용자만 남기고 테이블 초기화
      } else {
        setMessage('사용자 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Error submitting users:', error);
      if (error.response) {
        // 서버 응답이 있는 경우
        if (error.response.status === 422) {
          setMessage('입력 데이터 형식이 잘못되었습니다. 모든 필드를 올바르게 입력해주세요.');
        } else if (error.response.data && error.response.data.detail) {
          setMessage(`서버 오류: ${error.response.data.detail}`);
        } else {
          setMessage(`서버 오류 (${error.response.status}): 다시 시도해주세요.`);
        }
      } else {
        setMessage('서버 연결 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 테이블 초기화
  const handleClearTable = () => {
    if (users.length > 0) {
      if (window.confirm('테이블의 모든 데이터를 삭제하시겠습니까?')) {
        setUsers([]);
        setMessage('');
      }
    }
  };

  return (
    <div className="userRegister-container">
      <div className="userRegister-page-header">
        <h1>사용자 등록</h1>
        <p>사용자를 테이블에 입력하여 등록하세요.</p>
      </div>

      <div className="userRegister-table-section">
        <div className="userRegister-table-header">
          <h2>사용자 목록</h2>
          <div className="userRegister-table-actions">
            <button 
              onClick={handleClearTable} 
              className="userRegister-clear-btn"
              disabled={users.length === 0}
            >
              테이블 초기화
            </button>
          </div>
        </div>

        <EditableTable
          columns={columns}
          data={users}
          onUpdate={() => {}}          
          onDataChange={handleDataChange}
          addRowText="사용자 추가"
          showCopyButton={true}
        />

        <div className="userRegister-submit-section">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || users.length === 0}
            className="userRegister-submit-btn"
          >
            {isSubmitting ? '등록 중...' : '사용자 등록'}
          </button>
        </div>
        {message && (
          <div className={`userRegister-message ${message.includes('성공') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
        <EditableTable
                  columns={columns}
                  data={overlappedUsers}
                  showCopyButton={false}
                  showAddRow={false}
                  showPasteButton={false}
                  showDeleteButton={false}
                />

      </div>
    </div>
  );
};

export default UserRegister;
