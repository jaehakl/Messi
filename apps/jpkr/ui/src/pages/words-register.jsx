import React, { useState } from 'react';
import EditableTable from '../components/EditableTable';
import { createWordsBatch } from '../api/api';
import './WordsRegister.css';

const WordsRegister = () => {
  const [words, setWords] = useState([]);
  const [overlappedWords, setOverlappedWords] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // 테이블 컬럼 정의 - DB의 실제 Words 테이블 구조 반영
  const columns = [
    {
      key: 'word',
      label: '일본어 단어'
    },
    {
      key: 'jp_pronunciation',
      label: '일본어 발음'
    },
    {
      key: 'kr_pronunciation',
      label: '한국어 발음'
    },
    {
      key: 'kr_meaning',
      label: '한국어 뜻'
    },
    {
      key: 'level',
      label: '레벨'
    }
  ];

  // 데이터 변경 핸들러
  const handleDataChange = (newData) => {
    setWords(newData);
  };

  // 단어 등록 처리
  const handleSubmit = async () => {
    if (words.length === 0) {
      setMessage('등록할 단어가 없습니다.');
      return;
    }

    // 빈 행 필터링
    const validWords = words.filter(word => 
      word.word && word.jp_pronunciation && word.kr_pronunciation && word.kr_meaning && word.level
    );

    if (validWords.length === 0) {
      setMessage('모든 필드를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      // 백엔드가 기대하는 형식으로 데이터 전송 (words 배열을 직접 전송)
      const response = await createWordsBatch(validWords);
      
      if (response.status === 200 || response.status === 201) {

        if (Object.keys(response.data).length > 0) {
          setOverlappedWords(Object.values(response.data))
          setMessage(`중복되는 단어 ${Object.keys(response.data).length}개를 제외하고 성공적으로 등록되었습니다.`);
        } else {
          setOverlappedWords([])
          setMessage(`${validWords.length}개의 단어가 성공적으로 등록되었습니다.`);
        }
        const newWords = validWords.filter(word => response.data[word.word])
        console.log(newWords)
        setWords(newWords); // 중복단어만 남기고 테이블 초기화
      } else {
        setMessage('단어 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Error submitting words:', error);
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
    if (words.length > 0) {
      if (window.confirm('테이블의 모든 데이터를 삭제하시겠습니까?')) {
        setWords([]);
        setMessage('');
      }
    }
  };

  return (
    <div className="words-register-container">
      <div className="page-header">
        <h1>일본어 단어 등록</h1>
        <p>일본어 단어, 발음, 뜻을 테이블에 입력하여 등록하세요.</p>
      </div>

      <div className="table-section">
        <div className="table-header">
          <h2>단어 목록</h2>
          <div className="table-actions">
            <button 
              onClick={handleClearTable} 
              className="clear-btn"
              disabled={words.length === 0}
            >
              테이블 초기화
            </button>
          </div>
        </div>

        <EditableTable
          columns={columns}
          data={words}
          onDataChange={handleDataChange}
          addRowText="단어 추가"
          onUpdate={() => {}}          
          showCopyButton={true}
        />

        <div className="submit-section">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || words.length === 0}
            className="submit-btn"
          >
            {isSubmitting ? '등록 중...' : '단어 등록'}
          </button>
        </div>
        {message && (
          <div className={`message ${message.includes('성공') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
        <EditableTable
                  columns={columns}
                  data={overlappedWords}
                  showCopyButton={false}
                  showAddRow={false}
                  showPasteButton={false}
                  showDeleteButton={false}
                />

      </div>

      <div className="instructions">
        <h3>사용 방법</h3>
        <ul>
          <li>셀을 클릭하여 내용을 입력하세요</li>
          <li>Enter 키를 누르면 입력이 완료됩니다</li>
          <li>Escape 키를 누르면 편집을 취소할 수 있습니다</li>
          <li>빈 행은 자동으로 필터링됩니다</li>
          <li>단어 등록 후에는 "단어 관리" 페이지에서 전체 목록을 확인하고 수정/삭제할 수 있습니다</li>
        </ul>
        
        <h4>페이지 역할</h4>
        <ul>
          <li><strong>이 페이지 (단어 등록):</strong> 새로운 단어들을 입력하고 일괄 등록하는 용도</li>
          <li><strong>단어 관리 페이지:</strong> 등록된 모든 단어를 조회, 수정, 삭제하는 용도</li>
        </ul>
        
        <h4>TSV 붙여넣기 사용법</h4>
        <ul>
          <li>Excel이나 Google Sheets에서 데이터를 복사하세요</li>
          <li>각 열은 탭으로 구분되어야 합니다 (일본어 단어 → 일본어 발음 → 한국어 발음 → 한국어 뜻)</li>
          <li>"TSV 붙여넣기" 버튼을 클릭하면 클립보드의 데이터가 자동으로 추가됩니다</li>
          <li>여러 행을 한 번에 붙여넣을 수 있습니다</li>
        </ul>
        
        <h4>TSV 복사 사용법</h4>
        <ul>
          <li>테이블 상단의 "TSV 복사" 버튼을 클릭하면 입력된 단어들이 TSV 형식으로 클립보드에 복사됩니다</li>
          <li>복사된 데이터를 Excel이나 Google Sheets에 붙여넣을 수 있습니다</li>
          <li>빈 행은 자동으로 제외됩니다</li>
        </ul>
      </div>
    </div>
  );
};

export default WordsRegister;
