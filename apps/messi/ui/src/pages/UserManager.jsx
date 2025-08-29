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
  Stack,
  Toggle
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
  const [searchColumns, setSearchColumns] = useState(['display_name', 'email']);
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
    display_name: '',
    email: '',
    picture_url: '',
    is_active: true
  });
  
  const [editForm, setEditForm] = useState({});
  const [bulkForm, setBulkForm] = useState({
    action: 'update',
    field: 'is_active',
    value: true
  });

  const searchColumnOptions = [
    { label: '표시명', value: 'display_name' },
    { label: '이메일', value: 'email' },
    { label: '활성상태', value: 'is_active' }
  ];

  const bulkActionOptions = [
    { label: '일괄 수정', value: 'update' },
    { label: '일괄 삭제', value: 'delete' }
  ];

  const fieldOptions = [
    { label: '활성상태', value: 'is_active' },
    { label: '표시명', value: 'display_name' },
    { label: '이메일', value: 'email' },
    { label: '프로필 이미지', value: 'picture_url' }
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
      setCreateForm({ display_name: '', email: '', picture_url: '', is_active: true });
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
              <Form.ControlLabel>표시명</Form.ControlLabel>
              <Input
                value={createForm.display_name}
                onChange={(value) => setCreateForm(prev => ({ ...prev, display_name: value }))}
                placeholder="사용자 표시명"
              />
            </Form.Group>
            <Form.Group>
              <Form.ControlLabel>이메일</Form.ControlLabel>
              <Input
                value={createForm.email}
                onChange={(value) => setCreateForm(prev => ({ ...prev, email: value }))}
                placeholder="이메일 주소"
                type="email"
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
            <Form.Group>
              <Form.ControlLabel>활성상태</Form.ControlLabel>
              <Toggle
                checked={createForm.is_active}
                onChange={(checked) => setCreateForm(prev => ({ ...prev, is_active: checked }))}
                size="md"
              />
              <span style={{ marginLeft: 10, color: '#666' }}>
                {createForm.is_active ? '활성' : '비활성'}
              </span>
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
            <Form.Group>
              <Form.ControlLabel>활성상태</Form.ControlLabel>
              <Toggle
                checked={editForm.is_active !== undefined ? editForm.is_active : true}
                onChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
                size="md"
              />
              <span style={{ marginLeft: 10, color: '#666' }}>
                {editForm.is_active !== undefined ? editForm.is_active : true ? '활성' : '비활성'}
              </span>
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
                  {bulkForm.field === 'is_active' ? (
                    <Toggle
                      checked={bulkForm.value}
                      onChange={(checked) => setBulkForm(prev => ({ ...prev, value: checked }))}
                      size="md"
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

