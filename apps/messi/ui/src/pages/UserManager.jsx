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
  deleteUser
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
  const [searchColumns, setSearchColumns] = useState(['display_name', 'email']);
  const [sortColumn, setSortColumn] = useState('');
  const [sortType, setSortType] = useState('');
  const [filterValues, setFilterValues] = useState({});
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Form states - User_In 모델에 맞춤
  const [createForm, setCreateForm] = useState({
    display_name: '',
    email: '',
    picture_url: ''
  });
  
  const [editForm, setEditForm] = useState({});

  const searchColumnOptions = [
    { label: '표시명', value: 'display_name' },
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
        setTotal(data.meta?.total || data.items.length);
      } else {
        setUsers(data || []);
        setTotal(data?.length || 0);
      }
    } catch (error) {
      console.error('Load users error:', error);
      toaster.push(
        <Message type="error" closable>
          사용자 목록을 불러오는데 실패했습니다: {error.response?.data?.detail || error.message}
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
      // User_In 모델에 맞는 데이터만 전송
      const userData = {
        display_name: createForm.display_name,
        email: createForm.email,
        picture_url: createForm.picture_url || null
      };
      
      await createUser(userData);
      toaster.push(
        <Message type="success" closable>
          사용자가 성공적으로 생성되었습니다.
        </Message>
      );
      setShowCreateModal(false);
      setCreateForm({ display_name: '', email: '', picture_url: '' });
      loadUsers();
    } catch (error) {
      console.error('Create user error:', error);
      toaster.push(
        <Message type="error" closable>
          사용자 생성에 실패했습니다: {error.response?.data?.detail || error.message}
        </Message>
      );
    }
  };

  // Handle edit user
  const handleEdit = async () => {
    try {
      // 수정할 필드만 전송 (id 제외)
      const patchData = {};
      if (editForm.display_name !== undefined) patchData.display_name = editForm.display_name;
      if (editForm.email !== undefined) patchData.email = editForm.email;
      if (editForm.picture_url !== undefined) patchData.picture_url = editForm.picture_url;
      
      await updateUser(editingUser.id, patchData);
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
      console.error('Update user error:', error);
      toaster.push(
        <Message type="error" closable>
          사용자 수정에 실패했습니다: {error.response?.data?.detail || error.message}
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
        console.error('Delete user error:', error);
        toaster.push(
          <Message type="error" closable>
            사용자 삭제에 실패했습니다: {error.response?.data?.detail || error.message}
          </Message>
        );
      }
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({ 
      display_name: user.display_name || '',
      email: user.email || '',
      picture_url: user.picture_url || ''
    });
    setShowEditModal(true);
  };

  // Handle row selection
  const handleRowSelect = (selectedRowKeys) => {
    setSelectedUsers(selectedRowKeys);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
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
              <HeaderCell>표시명</HeaderCell>
              <Cell dataKey="display_name" />
            </Column>
            
            <Column flexGrow={1} sortable>
              <HeaderCell>이메일</HeaderCell>
              <Cell dataKey="email" />
            </Column>
            
            <Column width={120} sortable>
              <HeaderCell>이메일 인증</HeaderCell>
              <Cell>
                {(rowData) => formatDate(rowData.email_verified_at)}
              </Cell>
            </Column>
            
            <Column width={100} align="center" sortable>
              <HeaderCell>활성상태</HeaderCell>
              <Cell>
                {(rowData) => (
                  <span style={{ 
                    color: rowData.is_active ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {rowData.is_active ? '활성' : '비활성'}
                  </span>
                )}
              </Cell>
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
              <Form.ControlLabel>표시명 *</Form.ControlLabel>
              <Input
                value={createForm.display_name}
                onChange={(value) => setCreateForm(prev => ({ ...prev, display_name: value }))}
                placeholder="사용자 표시명"
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>이메일 *</Form.ControlLabel>
              <Input
                value={createForm.email}
                onChange={(value) => setCreateForm(prev => ({ ...prev, email: value }))}
                placeholder="이메일 주소"
                type="email"
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>프로필 이미지 URL</Form.ControlLabel>
              <Input
                value={createForm.picture_url}
                onChange={(value) => setCreateForm(prev => ({ ...prev, picture_url: value }))}
                placeholder="프로필 이미지 URL (선택사항)"
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
              <Form.ControlLabel>표시명</Form.ControlLabel>
              <Input
                value={editForm.display_name || ''}
                onChange={(value) => setEditForm(prev => ({ ...prev, display_name: value }))}
                placeholder="사용자 표시명"
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>이메일</Form.ControlLabel>
              <Input
                value={editForm.email || ''}
                onChange={(value) => setEditForm(prev => ({ ...prev, email: value }))}
                placeholder="이메일 주소"
                type="email"
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>프로필 이미지 URL</Form.ControlLabel>
              <Input
                value={editForm.picture_url || ''}
                onChange={(value) => setEditForm(prev => ({ ...prev, picture_url: value }))}
                placeholder="프로필 이미지 URL (선택사항)"
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
    </div>
  );
};

export default UserManager;

