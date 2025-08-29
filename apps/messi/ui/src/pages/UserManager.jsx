import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Panel,
  Table,
  Button,
  Modal,
  Form,
  Input,
  ButtonGroup,
  Pagination,
  InputGroup,
  SelectPicker,
  Message,
  toaster,
  Checkbox,
  Stack
} from 'rsuite';
import {
  usersListByFilter,
  createUser,
  updateUser,
  deleteUser,
  bulkUpsertUsers,
  bulkUpdateUsers,
  bulkDeleteUsers
} from '../api';
import './UserManager.css';

const { Column, HeaderCell, Cell } = Table;

const UserManager = () => {
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumns, setSearchColumns] = useState(['name', 'email']);
  const [sortColumn, setSortColumn] = useState('');
  const [sortType, setSortType] = useState('');
  const [filterValues, setFilterValues] = useState({});
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    level: 'N5'
  });
  
  const [editForm, setEditForm] = useState({});
  const [bulkForm, setBulkForm] = useState({
    action: 'update',
    field: 'level',
    value: 'N5'
  });

  const levels = [
    { label: 'N5', value: 'N5' },
    { label: 'N4', value: 'N4' },
    { label: 'N3', value: 'N3' },
    { label: 'N2', value: 'N2' },
    { label: 'N1', value: 'N1' }
  ];

  const searchColumnOptions = [
    { label: '이름', value: 'name' },
    { label: '이메일', value: 'email' },
    { label: '레벨', value: 'level' }
  ];

  const bulkActionOptions = [
    { label: '일괄 수정', value: 'update' },
    { label: '일괄 삭제', value: 'delete' }
  ];

  const fieldOptions = [
    { label: '레벨', value: 'level' },
    { label: '이름', value: 'name' },
    { label: '이메일', value: 'email' }
  ];

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        q: searchQuery,
        search_columns: searchColumns,
        sort: sortColumn ? `${sortColumn}:${sortType}` : undefined,
        filter_values: filterValues
      };
      
      const response = await usersListByFilter(params);
      const data = response.data;
      
      if (data && data.items) {
        setUsers(data.items);
        setTotal(data.total || data.items.length);
      } else {
        setUsers(data || []);
        setTotal(data?.length || 0);
      }
    } catch (error) {
      toaster.push(
        <Message type="error" closable>
          사용자 목록을 불러오는데 실패했습니다: {error.message}
        </Message>
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, searchQuery, sortColumn, sortType]);

  // Handle table sort
  const handleSortColumn = (sortColumn, sortType) => {
    setSortColumn(sortColumn);
    setSortType(sortType);
  };

  // Handle search
  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  // Handle create user
  const handleCreate = async () => {
    try {
      await createUser(createForm);
      toaster.push(
        <Message type="success" closable>
          사용자가 성공적으로 생성되었습니다.
        </Message>
      );
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', level: 'N5' });
      loadUsers();
    } catch (error) {
      toaster.push(
        <Message type="error" closable>
          사용자 생성에 실패했습니다: {error.message}
        </Message>
      );
    }
  };

  // Handle edit user
  const handleEdit = async () => {
    try {
      await updateUser(editingUser.id, editForm);
      toaster.push(
        <Message type="success" closable>
          사용자가 성공적으로 수정되었습니다.
        </Message>
      );
      setShowEditModal(false);
      setEditingUser(null);
      setEditForm({});
      loadUsers();
    } catch (error) {
      toaster.push(
        <Message type="error" closable>
          사용자 수정에 실패했습니다: {error.message}
        </Message>
      );
    }
  };

  // Handle delete user
  const handleDelete = async (id) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      try {
        await deleteUser(id);
        toaster.push(
          <Message type="success" closable>
            사용자가 성공적으로 삭제되었습니다.
          </Message>
        );
        loadUsers();
      } catch (error) {
        toaster.push(
          <Message type="error" closable>
            사용자 삭제에 실패했습니다: {error.message}
          </Message>
        );
      }
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async () => {
    if (selectedUsers.length === 0) {
      toaster.push(
        <Message type="warning" closable>
          선택된 사용자가 없습니다.
        </Message>
      );
      return;
    }

    try {
      if (bulkForm.action === 'update') {
        const patch = { [bulkForm.field]: bulkForm.value };
        await bulkUpdateUsers(selectedUsers, patch);
        toaster.push(
          <Message type="success" closable>
            선택된 사용자들이 성공적으로 수정되었습니다.
          </Message>
        );
      } else if (bulkForm.action === 'delete') {
        if (window.confirm('정말로 선택된 사용자들을 삭제하시겠습니까?')) {
          await bulkDeleteUsers(selectedUsers);
          toaster.push(
            <Message type="success" closable>
              선택된 사용자들이 성공적으로 삭제되었습니다.
            </Message>
          );
        }
      }
      setShowBulkModal(false);
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      toaster.push(
        <Message type="error" closable>
          일괄 작업에 실패했습니다: {error.message}
        </Message>
      );
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({ ...user });
    setShowEditModal(true);
  };

  // Handle row selection
  const handleRowSelect = (selectedRowKeys) => {
    setSelectedUsers(selectedRowKeys);
  };

  return (
    <div className="user-manager-container">
      <Panel header="사용자 관리" bordered>
        {/* Navigation */}
        <div style={{ marginBottom: 20, textAlign: 'left' }}>
          <Button 
            appearance="ghost" 
            onClick={() => navigate('/')}
            style={{ marginBottom: 10 }}
          >
            ← 홈으로 돌아가기
          </Button>
        </div>
        
        {/* Search and Filter Section */}
        <div className="search-filter-section">
          <Stack spacing={10} wrap>
            <InputGroup>
              <Input
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={setSearchQuery}
                onPressEnter={handleSearch}
              />
              <Button appearance="primary" onClick={handleSearch}>
                검색
              </Button>
            </InputGroup>
            
            <SelectPicker
              placeholder="검색 컬럼 선택"
              data={searchColumnOptions}
              value={searchColumns}
              onChange={setSearchColumns}
              multiple
              style={{ width: 200 }}
            />
            
            <Button appearance="primary" onClick={() => setShowCreateModal(true)}>
              새 사용자
            </Button>
            
            <Button 
              appearance="ghost" 
              onClick={() => setShowBulkModal(true)}
              disabled={selectedUsers.length === 0}
            >
              일괄 작업 ({selectedUsers.length})
            </Button>
          </Stack>
        </div>

        {/* Users Table */}
        <div className="users-table-section">
          <Table
            data={users}
            loading={loading}
            autoHeight
            bordered
            cellBordered
            rowKey="id"
            selectedRowKeys={selectedUsers}
            onRowClick={(rowData) => {
              const key = rowData.id;
              setSelectedUsers(prev => 
                prev.includes(key) 
                  ? prev.filter(k => k !== key)
                  : [...prev, key]
              );
            }}
            sortColumn={sortColumn}
            sortType={sortType}
            onSortColumn={handleSortColumn}
          >
            <Column width={50} align="center">
              <HeaderCell>선택</HeaderCell>
              <Cell>
                {(rowData) => (
                  <Checkbox
                    checked={selectedUsers.includes(rowData.id)}
                    onChange={() => {
                      const key = rowData.id;
                      setSelectedUsers(prev => 
                        prev.includes(key) 
                          ? prev.filter(k => k !== key)
                          : [...prev, key]
                      );
                    }}
                  />
                )}
              </Cell>
            </Column>
            
            <Column flexGrow={1} sortable>
              <HeaderCell>이름</HeaderCell>
              <Cell dataKey="name" />
            </Column>
            
            <Column flexGrow={1} sortable>
              <HeaderCell>이메일</HeaderCell>
              <Cell dataKey="email" />
            </Column>
            
            <Column width={100} sortable>
              <HeaderCell>레벨</HeaderCell>
              <Cell dataKey="level" />
            </Column>
            
            <Column width={150} align="center">
              <HeaderCell>작업</HeaderCell>
              <Cell>
                {(rowData) => (
                  <ButtonGroup size="xs">
                    <Button appearance="ghost" onClick={() => openEditModal(rowData)}>
                      수정
                    </Button>
                    <Button appearance="ghost" color="red" onClick={() => handleDelete(rowData.id)}>
                      삭제
                    </Button>
                  </ButtonGroup>
                )}
              </Cell>
            </Column>
          </Table>

          {/* Pagination */}
          <div className="pagination-section">
            <Pagination
              prev
              next
              size="md"
              total={total}
              limit={pageSize}
              limitOptions={[10, 20, 50]}
              activePage={page}
              onChangePage={setPage}
              onChangeLimit={setPageSize}
            />
          </div>
        </div>
      </Panel>

      {/* Create User Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <Modal.Header>
          <Modal.Title>새 사용자 생성</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid>
            <Form.Group>
              <Form.ControlLabel>이름</Form.ControlLabel>
              <Input
                value={createForm.name}
                onChange={(value) => setCreateForm(prev => ({ ...prev, name: value }))}
                placeholder="사용자 이름"
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>이메일</Form.ControlLabel>
              <Input
                value={createForm.email}
                onChange={(value) => setCreateForm(prev => ({ ...prev, email: value }))}
                placeholder="이메일 주소"
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>레벨</Form.ControlLabel>
              <SelectPicker
                data={levels}
                value={createForm.level}
                onChange={(value) => setCreateForm(prev => ({ ...prev, level: value }))}
                style={{ width: '100%' }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" onClick={handleCreate}>
            생성
          </Button>
          <Button appearance="ghost" onClick={() => setShowCreateModal(false)}>
            취소
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
        <Modal.Header>
          <Modal.Title>사용자 수정</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid>
            <Form.Group>
              <Form.ControlLabel>이름</Form.ControlLabel>
              <Input
                value={editForm.name || ''}
                onChange={(value) => setEditForm(prev => ({ ...prev, name: value }))}
                placeholder="사용자 이름"
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>이메일</Form.ControlLabel>
              <Input
                value={editForm.email || ''}
                onChange={(value) => setEditForm(prev => ({ ...prev, email: value }))}
                placeholder="이메일 주소"
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>레벨</Form.ControlLabel>
              <SelectPicker
                data={levels}
                value={editForm.level || 'N5'}
                onChange={(value) => setEditForm(prev => ({ ...prev, level: value }))}
                style={{ width: '100%' }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" onClick={handleEdit}>
            수정
          </Button>
          <Button appearance="ghost" onClick={() => setShowEditModal(false)}>
            취소
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Operations Modal */}
      <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)}>
        <Modal.Header>
          <Modal.Title>일괄 작업</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid>
            <Form.Group>
              <Form.ControlLabel>작업 유형</Form.ControlLabel>
              <SelectPicker
                data={bulkActionOptions}
                value={bulkForm.action}
                onChange={(value) => setBulkForm(prev => ({ ...prev, action: value }))}
                style={{ width: '100%' }}
              />
            </Form.Group>
            
            {bulkForm.action === 'update' && (
              <>
                <Form.Group>
                  <Form.ControlLabel>수정할 필드</Form.ControlLabel>
                  <SelectPicker
                    data={fieldOptions}
                    value={bulkForm.field}
                    onChange={(value) => setBulkForm(prev => ({ ...prev, field: value }))}
                    style={{ width: '100%' }}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.ControlLabel>새 값</Form.ControlLabel>
                  {bulkForm.field === 'level' ? (
                    <SelectPicker
                      data={levels}
                      value={bulkForm.value}
                      onChange={(value) => setBulkForm(prev => ({ ...prev, value }))}
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <Input
                      value={bulkForm.value}
                      onChange={(value) => setBulkForm(prev => ({ ...prev, value }))}
                      placeholder="새 값을 입력하세요"
                    />
                  )}
                </Form.Group>
              </>
            )}
            
            <div className="bulk-info-box">
              <strong>선택된 사용자: {selectedUsers.length}명</strong>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" onClick={handleBulkOperation}>
            {bulkForm.action === 'update' ? '일괄 수정' : '일괄 삭제'}
          </Button>
          <Button appearance="ghost" onClick={() => setShowBulkModal(false)}>
            취소
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserManager;
