import React, { useState, useEffect } from 'react';
import EditableTable from '../components/EditableTable';
import Pagination from '../components/Pagination';
import { getAllExamples, updateExamplesBatch, deleteExamplesBatch } from '../api/api';
import './ExamplesTable.css';

const ExamplesTable = () => {
  const [examples, setExamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalExamples, setTotalExamples] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 컬럼 정의
  const columns = [
    { key: 'word_info', label: '단어 정보', editable: false },
    { key: 'tags', label: '태그', editable: true },
    { key: 'jp_text', label: '일본어 예문', editable: true },
    { key: 'kr_meaning', label: '한국어 의미', editable: true },
    { key: 'updated_at', label: '수정일', editable: false },
  ];

  // Examples 데이터 불러오기
  const fetchExamples = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * pageSize;
      const response = await getAllExamples(pageSize, offset);
      
      if (response.data) {
        setExamples(response.data.examples || []);
        setTotalExamples(response.data.total_count || 0);
        setTotalPages(Math.ceil(response.data.total_count / pageSize));
      } else {
        setExamples([]);
        setTotalExamples(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error('Examples 데이터 불러오기 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    fetchExamples(currentPage);
  }, [currentPage]);

  // 페이지 변경 처리
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 데이터 변경 처리
  const handleDataChange = (newData) => {
    setExamples(newData);
  };

  // 선택된 행들 일괄 수정
  const handleBatchUpdate = async (examplesToUpdate) => {
    if (!examplesToUpdate || examplesToUpdate.length === 0) {
      alert('수정할 예문이 없습니다.');
      return;
    }

    // word_id를 숫자로 변환하고 word_info 필드 제거
    const processedExamples = examplesToUpdate.map(example => {
        return {
          id: example.id,
          tags: example.tags,
          jp_text: example.jp_text,
          kr_meaning: example.kr_meaning,
        };
      });
    console.log(processedExamples);

    try {
      await updateExamplesBatch(processedExamples);
      alert('예문들이 성공적으로 수정되었습니다.');
      fetchExamples(currentPage); // 현재 페이지 데이터 새로고침
    } catch (err) {
      console.error('일괄 수정 실패:', err);
      alert('수정에 실패했습니다.');
    }
  };

  // 선택된 행들 일괄 삭제
  const handleBatchDelete = async (exampleIds) => {
    console.log(exampleIds);
    if (!exampleIds || exampleIds.length === 0) {
      alert('삭제할 예문이 없습니다.');
      return;
    }

    if (!confirm(`선택된 ${exampleIds.length}개의 예문을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteExamplesBatch(exampleIds);
      alert('선택된 예문들이 성공적으로 삭제되었습니다.');
      fetchExamples(currentPage); // 현재 페이지 데이터 새로고침
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
        <button onClick={() => fetchExamples(currentPage)} className="retry-btn">다시 시도</button>
      </div>
    );
  }

  return (
    <div className="examples-table-page">
      <div className="page-header">
        <h1>예문 관리</h1>
        <div className="page-info">
          <span>페이지 {currentPage} / {totalPages || 1}</span>
          <span>총 {totalExamples}개의 예문</span>
        </div>
      </div>

      <div className="pagination-section">
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <div className="table-section">
        <EditableTable
          columns={columns}
          data={examples}
          onDataChange={handleDataChange}
          onUpdate={handleBatchUpdate}
          onDelete={handleBatchDelete}
          showAddRow={false}
          showPasteButton={false}
          showCopyButton={true}
        />
      </div>

      <div className="page-footer">
        <p>현재 페이지: {examples.length}개의 예문이 표시됩니다.</p>
      </div>
    </div>
  );
};

export default ExamplesTable;
