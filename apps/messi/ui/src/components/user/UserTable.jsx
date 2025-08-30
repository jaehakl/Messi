import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EditableTable from '../EditableTable';
import Pagination from '../Pagination';
import { usersRead, usersDelete, usersUpsert } from '../../api';
import './UserTable.css';


const UserTable = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 컬럼 정의
  const columns = [
    { key: 'display_name', label: '표시명', editable: true },
    { key: 'email', label: '이메일', editable: true },
    { key: 'picture_url', label: '프로필 이미지', editable: true },
  ];

  // Words 데이터 불러오기
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * pageSize;
      const filterData = {
        start: offset,
        limit: pageSize,
        sort_column: 'display_name',
        sort_order: 'asc'
      };
      const response = await usersRead(filterData);
      
      if (response.data) {
        setUsers(response.data.rows || []);
        setTotalUsers(response.data.total || 0);
        setTotalPages(Math.ceil(response.data.total / pageSize));
      } else {
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error('Users 데이터 불러오기 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  // 페이지 변경 처리
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 데이터 변경 처리
  const handleDataChange = (newData) => {
    setUsers(newData);
  };

  // 선택된 행들 일괄 수정
  const handleBatchUpdate = async (usersToUpdate) => {
    if (!usersToUpdate || usersToUpdate.length === 0) {
      alert('수정할 사용자가 없습니다.');
      return;
    }
    try {
      await usersUpsert(usersToUpdate);
      alert('사용자들이 성공적으로 수정되었습니다.');
      fetchUsers(currentPage); // 현재 페이지 데이터 새로고침
    } catch (err) {
      console.error('일괄 수정 실패:', err);
      alert('수정에 실패했습니다.');
    }
  };

  // 선택된 행들 일괄 삭제
  const handleBatchDelete = async (userIds) => {
    if (!userIds || userIds.length === 0) {
      alert('삭제할 사용자가 없습니다.');
      return;
    }

    if (!confirm(`선택된 ${userIds.length}개의 사용자를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await usersDelete(userIds);
      alert('선택된 사용자들이 성공적으로 삭제되었습니다.');
      fetchUsers(currentPage); // 현재 페이지 데이터 새로고침
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
        <button onClick={() => fetchUsers(currentPage)} className="retry-btn">다시 시도</button>
      </div>
    );
  }

  return (
    <div className="userTable-page">
      <div className="userTable-page-header">
        <h1>사용자 관리</h1>
      </div>
      <div className="userTable-pagination-section">
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
      <span>페이지 {currentPage} / {totalPages || 1}</span>
      <span>총 {totalUsers}개의 사용자</span>

      <div className="userTable-table-section">
        <EditableTable
          columns={columns}
          data={users}
          onDataChange={handleDataChange}
          onUpdate={handleBatchUpdate}
          onDelete={handleBatchDelete}
          showAddRow={false}
          showPasteButton={false}
          showCopyButton={true}
        />
      </div>

      <div className="userTable-page-footer">
        <p>현재 페이지: {users.length}개의 사용자가 표시됩니다.</p>
      </div>
    </div>
  );
};

export default UserTable;
