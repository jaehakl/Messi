import React, { useState, useEffect, useCallback } from 'react';
import { imagesRead, imagesDelete } from '../../api';
import './imageList.css';

const ImageList = () => {
    const [images, setImages] = useState({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedImages, setSelectedImages] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    
    // 필터 및 정렬 상태
    const [filters, setFilters] = useState({
        tags: '',
        search_dict: {},
        combine: 'and'
    });
    
    // 페이지네이션 상태
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 12
    });
    
    // 정렬 상태
    const [sorting, setSorting] = useState({
        sort_column: 'created_at',
        sort_order: 'desc'
    });

    // 이미지 목록 조회
    const fetchImages = useCallback(async () => {
        setLoading(true);
        try {
            const filterData = {
                search_dict: filters.search_dict,
                combine: filters.combine,
                sort_column: sorting.sort_column,
                sort_order: sorting.sort_order,
                start: (pagination.currentPage - 1) * pagination.pageSize,
                limit: pagination.pageSize
            };
            
            const response = await imagesRead(filterData);
            setImages(response.data.images || {});
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('이미지 조회 오류:', error);
            alert('이미지 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filters, sorting, pagination]);

    // 컴포넌트 마운트 시 및 필터/정렬/페이지 변경 시 이미지 조회
    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    // 태그 필터 변경
    const handleTagFilterChange = (e) => {
        const tags = e.target.value;
        setFilters(prev => ({
            ...prev,
            tags,
            search_dict: tags.trim() ? { tags: [tags.trim()] } : {}
        }));
        setPagination(prev => ({ ...prev, currentPage: 1 })); // 첫 페이지로 이동
    };

    // 정렬 변경
    const handleSortChange = (column) => {
        setSorting(prev => ({
            sort_column: column,
            sort_order: prev.sort_column === column && prev.sort_order === 'asc' ? 'desc' : 'asc'
        }));
        setPagination(prev => ({ ...prev, currentPage: 1 })); // 첫 페이지로 이동
    };

    // 페이지 변경
    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    };

    // 이미지 선택/해제
    const toggleImageSelection = (imageId) => {
        setSelectedImages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(imageId)) {
                newSet.delete(imageId);
            } else {
                newSet.add(imageId);
            }
            return newSet;
        });
    };

    // 전체 선택/해제
    const toggleAllImages = () => {
        if (selectedImages.size === Object.keys(images).length) {
            setSelectedImages(new Set());
        } else {
            setSelectedImages(new Set(Object.keys(images).map(id => parseInt(id))));
        }
    };

    // 선택된 이미지 일괄 삭제
    const handleBatchDelete = async () => {
        if (selectedImages.size === 0) {
            alert('삭제할 이미지를 선택해주세요.');
            return;
        }

        if (!confirm(`선택된 ${selectedImages.size}장의 이미지를 삭제하시겠습니까?`)) {
            return;
        }

        setDeleting(true);
        try {
            await imagesDelete(Array.from(selectedImages));
            alert('선택된 이미지가 삭제되었습니다.');
            setSelectedImages(new Set());
            fetchImages(); // 목록 새로고침
        } catch (error) {
            console.error('삭제 오류:', error);
            alert('이미지 삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleting(false);
        }
    };

    // 파일 크기 포맷팅
    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 날짜 포맷팅
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 총 페이지 수 계산
    const totalPages = Math.ceil(total / pagination.pageSize);

    return (
        <div className="image-list-container">
            <h2>이미지 목록</h2>
            
            {/* 필터 및 정렬 컨트롤 */}
            <div className="controls-section">
                <div className="filter-controls">
                    <div className="filter-group">
                        <label htmlFor="tag-filter">태그 필터:</label>
                        <input
                            id="tag-filter"
                            type="text"
                            value={filters.tags}
                            onChange={handleTagFilterChange}
                            placeholder="태그로 검색..."
                            className="tag-input"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>정렬:</label>
                        <div className="sort-buttons">
                            <button
                                className={`sort-btn ${sorting.sort_column === 'created_at' ? 'active' : ''}`}
                                onClick={() => handleSortChange('created_at')}
                            >
                                업로드 날짜 {sorting.sort_column === 'created_at' && (sorting.sort_order === 'asc' ? '↑' : '↓')}
                            </button>
                            <button
                                className={`sort-btn ${sorting.sort_column === 'size_bytes' ? 'active' : ''}`}
                                onClick={() => handleSortChange('size_bytes')}
                            >
                                파일 크기 {sorting.sort_column === 'size_bytes' && (sorting.sort_order === 'asc' ? '↑' : '↓')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 일괄 삭제 버튼 */}
                {selectedImages.size > 0 && (
                    <div className="batch-actions">
                        <span className="selected-count">
                            {selectedImages.size}장 선택됨
                        </span>
                        <button
                            className="delete-selected-btn"
                            onClick={handleBatchDelete}
                            disabled={deleting}
                        >
                            {deleting ? '삭제 중...' : '선택 삭제'}
                        </button>
                    </div>
                )}
            </div>

            {/* 이미지 그리드 */}
            {loading ? (
                <div className="loading">로딩 중...</div>
            ) : Object.keys(images).length === 0 ? (
                <div className="no-images">이미지가 없습니다.</div>
            ) : (
                <>
                    <div className="images-header">
                        <div className="select-all-section">
                            <input
                                type="checkbox"
                                checked={selectedImages.size === Object.keys(images).length && Object.keys(images).length > 0}
                                onChange={toggleAllImages}
                                className="select-all-checkbox"
                            />
                            <label>전체 선택</label>
                        </div>
                        <div className="total-count">
                            총 {total}장의 이미지
                        </div>
                    </div>

                    <div className="images-grid">
                        {Object.entries(images).map(([id, imageUrl]) => (
                            <div key={id} className="image-item">
                                <div className="image-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedImages.has(parseInt(id))}
                                        onChange={() => toggleImageSelection(parseInt(id))}
                                    />
                                </div>
                                
                                <div className="image-content">
                                    <img 
                                        src={imageUrl} 
                                        alt={`이미지 ${id}`}
                                        className="image-thumbnail"
                                    />
                                    
                                    <div className="image-info">
                                        <div className="image-id">ID: {id}</div>
                                        <div className="image-tags">
                                            태그: {filters.tags || '없음'}
                                        </div>
                                        <div className="image-size">
                                            크기: {formatFileSize(0)} {/* API에서 size 정보를 가져와야 함 */}
                                        </div>
                                        <div className="image-date">
                                            업로드: {formatDate(new Date())} {/* API에서 date 정보를 가져와야 함 */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="page-btn"
                                onClick={() => handlePageChange(1)}
                                disabled={pagination.currentPage === 1}
                            >
                                처음
                            </button>
                            
                            <button
                                className="page-btn"
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                            >
                                이전
                            </button>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = Math.max(1, Math.min(totalPages - 4, pagination.currentPage - 2)) + i;
                                if (page > totalPages) return null;
                                
                                return (
                                    <button
                                        key={page}
                                        className={`page-btn ${page === pagination.currentPage ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            
                            <button
                                className="page-btn"
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === totalPages}
                            >
                                다음
                            </button>
                            
                            <button
                                className="page-btn"
                                onClick={() => handlePageChange(totalPages)}
                                disabled={pagination.currentPage === totalPages}
                            >
                                마지막
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ImageList;

