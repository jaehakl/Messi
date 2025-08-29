import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EditableTable from '../components/EditableTable';
import Pagination from '../components/Pagination';
import { getAllWords, updateWordsBatch, deleteWordsBatch } from '../api/api';
import './WordsTable.css';


const WordsTable = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalWords, setTotalWords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 컬럼 정의
  const columns = [
    { key: 'word', label: '단어', editable: true },
    { key: 'jp_pronunciation', label: '일본어 발음', editable: true },
    { key: 'kr_pronunciation', label: '한글 발음', editable: true },
    { key: 'kr_meaning', label: '한글 의미', editable: true },
    { key: 'level', label: '레벨', editable: true },
    { key: 'num_examples', label: '예문 수', editable: false },
  ];

  // Words 데이터 불러오기
  const fetchWords = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * pageSize;
      const response = await getAllWords(pageSize, offset);
      
      if (response.data) {
        setWords(response.data.words || []);
        setTotalWords(response.data.total_count || 0);
        setTotalPages(Math.ceil(response.data.total_count / pageSize));
      } else {
        setWords([]);
        setTotalWords(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error('Words 데이터 불러오기 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    fetchWords(currentPage);
  }, [currentPage]);

  // 페이지 변경 처리
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 데이터 변경 처리
  const handleDataChange = (newData) => {
    setWords(newData);
  };

  // 선택된 행들 일괄 수정
  const handleBatchUpdate = async (wordsToUpdate) => {
    if (!wordsToUpdate || wordsToUpdate.length === 0) {
      alert('수정할 단어가 없습니다.');
      return;
    }
    try {
      await updateWordsBatch(wordsToUpdate);
      alert('단어들이 성공적으로 수정되었습니다.');
      fetchWords(currentPage); // 현재 페이지 데이터 새로고침
    } catch (err) {
      console.error('일괄 수정 실패:', err);
      alert('수정에 실패했습니다.');
    }
  };

  // 선택된 행들 일괄 삭제
  const handleBatchDelete = async (wordIds) => {
    if (!wordIds || wordIds.length === 0) {
      alert('삭제할 단어가 없습니다.');
      return;
    }

    if (!confirm(`선택된 ${wordIds.length}개의 단어를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteWordsBatch(wordIds);
      alert('선택된 단어들이 성공적으로 삭제되었습니다.');
      fetchWords(currentPage); // 현재 페이지 데이터 새로고침
    } catch (err) {
      console.error('일괄 삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return <div className="loading">데이터를 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => fetchWords(currentPage)} className="retry-btn">다시 시도</button>
      </div>
    );
  }

  const handleBatchAddExamples = async (wordIds) => {
    if (!wordIds || wordIds.length === 0) {
      alert('예문을 추가할 단어를 선택해주세요.');
      return;
    }
    
    // 선택된 단어들의 정보를 가져오기
    const selectedWords = words.filter(word => wordIds.includes(word.id));
    
    // 선택된 단어 ID들과 단어 정보를 쿼리 파라미터로 전달
    const queryParams = new URLSearchParams();
    wordIds.forEach(id => queryParams.append('wordIds', id));
    
    // 단어 정보를 JSON으로 인코딩하여 전달
    const wordsInfo = selectedWords.map(word => ({
      id: word.id,
      word: word.word,
      jp_pronunciation: word.jp_pronunciation,
      kr_pronunciation: word.kr_pronunciation,
      kr_meaning: word.kr_meaning,
      level: word.level
    }));
    queryParams.append('wordsInfo', JSON.stringify(wordsInfo));
    
    navigate(`/examples-register?${queryParams.toString()}`);
  };

  return (
    <div className="words-table-page">
      <div className="page-header">
        <h1>단어 관리</h1>
      </div>
      <div className="pagination-section">
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
      <span>페이지 {currentPage} / {totalPages || 1}</span>
      <span>총 {totalWords}개의 단어</span>

      <div className="table-section">
        <EditableTable
          columns={columns}
          data={words}
          onDataChange={handleDataChange}
          onUpdate={handleBatchUpdate}
          onDelete={handleBatchDelete}
          onAction={handleBatchAddExamples}
          actionText="예문 추가"
          showAddRow={false}
          showPasteButton={false}
          showCopyButton={true}
        />
      </div>

      <div className="page-footer">
        <p>현재 페이지: {words.length}개의 단어가 표시됩니다.</p>
      </div>
    </div>
  );
};

export default WordsTable;
