import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import EditableTable from '../components/EditableTable';
import { createExamplesBatch } from '../api/api';
import './ExamplesRegister.css';

const ExamplesRegister = () => {
  const [searchParams] = useSearchParams();
  const [examples, setExamples] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // 테이블 컬럼 정의 - DB의 실제 Examples 테이블 구조 반영
  const columns = [
    {
      key: 'word_id',
      label: '단어 ID'
    },
    {
      key: 'word_info',
      label: '단어 정보',
      editable: false
    },
    {
      key: 'tags',
      label: '태그'
    },
    {
      key: 'jp_text',
      label: '일본어 예문'
    },
    {
      key: 'kr_meaning',
      label: '한국어 의미'
    }
  ];

  // URL 쿼리 파라미터에서 단어 ID들과 단어 정보를 읽어와서 초기 행들을 설정
  useEffect(() => {
    const wordIds = searchParams.getAll('wordIds');
    const wordsInfoParam = searchParams.get('wordsInfo');
    
    if (wordIds.length > 0) {
      let wordsInfo = [];
      
      // 단어 정보가 있으면 파싱
      if (wordsInfoParam) {
        try {
          wordsInfo = JSON.parse(wordsInfoParam);
        } catch (error) {
          console.error('단어 정보 파싱 오류:', error);
        }
      }
      
      const initialExamples = wordIds.map(wordId => {
        // 해당 단어의 정보 찾기
        const wordInfo = wordsInfo.find(w => w.id.toString() === wordId.toString());
        
        return {
          word_id: wordId,
          word_info: wordInfo ? `${wordInfo.word} (${wordInfo.kr_meaning})` : '',
          tags: '',
          jp_text: '',
          kr_meaning: ''
        };
      });
      
      setExamples(initialExamples);
      setMessage(`${wordIds.length}개의 단어가 미리 설정되었습니다. 예문을 입력해주세요.`);
    }
  }, [searchParams]);

  // 데이터 변경 핸들러
  const handleDataChange = (newData) => {
    setExamples(newData);
  };

  // 예문 등록 처리
  const handleSubmit = async () => {
    if (examples.length === 0) {
      setMessage('등록할 예문이 없습니다.');
      return;
    }

    // 빈 행 필터링 (word_id, jp_text, kr_meaning은 필수, tags는 선택)
    const validExamples = examples.filter(example => 
      example.word_id && example.jp_text && example.kr_meaning
    );

    if (validExamples.length === 0) {
      setMessage('단어 ID, 일본어 예문, 한국어 의미는 필수 입력 항목입니다.');
      return;
    }

    // word_id를 숫자로 변환하고 word_info 필드 제거
    const processedExamples = validExamples.map(example => {
      return {
        word_id: example.word_id,
        tags: example.tags,
        jp_text: example.jp_text,
        kr_meaning: example.kr_meaning,
      };
    });

    setIsSubmitting(true);
    setMessage('');

    try {
      // 백엔드가 기대하는 형식으로 데이터 전송 (examples 배열을 직접 전송)
      const response = await createExamplesBatch(processedExamples);
      
      if (response.status === 200 || response.status === 201) {
        setMessage(`${validExamples.length}개의 예문이 성공적으로 등록되었습니다.`);
        setExamples([]); // 테이블 초기화
      } else {
        setMessage('예문 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Error submitting examples:', error);
      if (error.response) {
        // 서버 응답이 있는 경우
        if (error.response.status === 422) {
          setMessage('입력 데이터 형식이 잘못되었습니다. 모든 필수 필드를 올바르게 입력해주세요.');
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
    if (examples.length > 0) {
      if (window.confirm('테이블의 모든 데이터를 삭제하시겠습니까?')) {
        setExamples([]);
        setMessage('');
      }
    }
  };

  // 선택된 단어 ID 개수 계산
  const selectedWordCount = searchParams.getAll('wordIds').length;

  return (
    <div className="examples-register-container">
      <div className="page-header">
        <h1>일본어 예문 등록</h1>
        <p>일본어 예문과 한국어 의미를 테이블에 입력하여 등록하세요.</p>
                 {selectedWordCount > 0 && (
           <p className="selected-words-info">
             선택된 단어: {selectedWordCount}개 (단어 정보가 미리 설정되었습니다)
           </p>
         )}
      </div>

      <div className="table-section">
        <div className="table-header">
          <h2>예문 목록</h2>
          <div className="table-actions">
            <button 
              onClick={handleClearTable} 
              className="clear-btn"
              disabled={examples.length === 0}
            >
              테이블 초기화
            </button>
          </div>
        </div>

        <EditableTable
          columns={columns}
          data={examples}
          onDataChange={handleDataChange}
          addRowText="예문 추가"
          showCopyButton={true}
        />

        <div className="submit-section">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || examples.length === 0}
            className="submit-btn"
          >
            {isSubmitting ? '등록 중...' : '예문 등록'}
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('성공') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="instructions">
        <h3>사용 방법</h3>
        <ul>
          <li>셀을 클릭하여 내용을 입력하세요</li>
          <li>Enter 키를 누르면 입력이 완료됩니다</li>
          <li>Escape 키를 누르면 편집을 취소할 수 있습니다</li>
          <li>빈 행은 자동으로 필터링됩니다</li>
          <li>예문 등록 후에는 "예문 관리" 페이지에서 전체 목록을 확인하고 수정/삭제할 수 있습니다</li>
        </ul>
        
                 <h4>필수 입력 항목</h4>
         <ul>
           <li><strong>단어 ID:</strong> 해당 예문이 속한 단어의 ID (숫자, 자동 설정됨)</li>
           <li><strong>단어 정보:</strong> 선택된 단어의 일본어와 한국어 의미 (자동 표시됨)</li>
           <li><strong>일본어 예문:</strong> 일본어로 된 예문 텍스트</li>
           <li><strong>한국어 의미:</strong> 예문의 한국어 번역 또는 의미</li>
           <li><strong>태그:</strong> 예문 분류를 위한 태그 (선택사항)</li>
         </ul>
        
        <h4>TSV 붙여넣기 사용법</h4>
        <ul>
          <li>Excel이나 Google Sheets에서 데이터를 복사하세요</li>
          <li>각 열은 탭으로 구분되어야 합니다 (단어 ID → 태그 → 일본어 예문 → 한국어 의미)</li>
          <li>"클립보드에서 붙여넣기" 버튼을 클릭하면 클립보드의 데이터가 자동으로 추가됩니다</li>
          <li>여러 행을 한 번에 붙여넣을 수 있습니다</li>
        </ul>
        
        <h4>TSV 복사 사용법</h4>
        <ul>
          <li>테이블 상단의 "클립보드에 복사" 버튼을 클릭하면 입력된 예문들이 TSV 형식으로 클립보드에 복사됩니다</li>
          <li>복사된 데이터를 Excel이나 Google Sheets에 붙여넣을 수 있습니다</li>
          <li>빈 행은 자동으로 제외됩니다</li>
        </ul>
        
        <h4>주의사항</h4>
        <ul>
          <li>단어 ID는 반드시 존재하는 단어의 ID여야 합니다</li>
          <li>단어 ID는 숫자 형식으로 입력해야 합니다</li>
          <li>일본어 예문과 한국어 의미는 필수 입력 항목입니다</li>
          <li>태그는 선택사항이므로 비워둘 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
};

export default ExamplesRegister;
