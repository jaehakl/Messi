import React, { useState, useRef, useCallback } from 'react';
import { imagesUpload } from '../../api';
import './imageUpload.css';

const ImageUpload = () => {
    const [images, setImages] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // 드래그 이벤트 핸들러
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
            addImages(imageFiles);
        }
    }, []);

    // 파일 선택 핸들러
    const handleFileSelect = useCallback((e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
            addImages(imageFiles);
        }
    }, []);

    // 이미지 추가
    const addImages = useCallback((files) => {
        const newImages = files.map(file => ({
            id: Date.now() + Math.random(),
            file: file,
            key_1: '',
            key_2: '',
            preview: URL.createObjectURL(file)
        }));
        
        setImages(prev => [...prev, ...newImages]);
    }, []);

    // 이미지 제거
    const removeImage = useCallback((id) => {
        setImages(prev => {
            const imageToRemove = prev.find(img => img.id === id);
            if (imageToRemove?.preview) {
                URL.revokeObjectURL(imageToRemove.preview);
            }
            return prev.filter(img => img.id !== id);
        });
    }, []);

    // 키 값 업데이트
    const updateImageKey = useCallback((id, field, value) => {
        setImages(prev => 
            prev.map(img => 
                img.id === id ? { ...img, [field]: value } : img
            )
        );
    }, []);

    // 일괄 업로드
    const handleUpload = async () => {
        if (images.length === 0) return;

        // 필수 필드 검증
        const hasEmptyKeys = images.some(img => !img.key_1.trim() || !img.key_2.trim());
        if (hasEmptyKeys) {
            alert('모든 이미지의 key_1과 key_2를 입력해주세요.');
            return;
        }

        setIsUploading(true);

        try {
            const listImageData = images.map(img => ({
                key_1: img.key_1.trim(),
                key_2: img.key_2.trim(),
                file_1: img.file
            }));

            await imagesUpload(listImageData);
            
            // 업로드 성공 후 이미지 목록 초기화
            images.forEach(img => {
                if (img.preview) {
                    URL.revokeObjectURL(img.preview);
                }
            });
            setImages([]);
            
            alert('이미지 업로드가 완료되었습니다.');
        } catch (error) {
            console.error('업로드 오류:', error);
            alert('이미지 업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    // 컴포넌트 언마운트 시 메모리 정리
    React.useEffect(() => {
        return () => {
            images.forEach(img => {
                if (img.preview) {
                    URL.revokeObjectURL(img.preview);
                }
            });
        };
    }, [images]);

    return (
        <div className="image-upload-container">
            <h2>이미지 업로드</h2>
            
            {/* 드래그&드롭 영역 */}
            <div 
                className={`drag-drop-zone ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="drag-drop-content">
                    <i className="upload-icon">📁</i>
                    <p>이미지 파일을 여기에 드래그&드롭하거나 클릭하여 선택하세요</p>
                    <p className="drag-drop-hint">지원 형식: JPG, PNG, GIF, WEBP</p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </div>

            {/* 이미지 카드 목록 */}
            {images.length > 0 && (
                <div className="images-section">
                    <div className="images-header">
                        <h3>업로드할 이미지 ({images.length}장)</h3>
                        <button 
                            className="upload-all-btn"
                            onClick={handleUpload}
                            disabled={isUploading}
                        >
                            {isUploading ? '업로드 중...' : '일괄 업로드'}
                        </button>
                    </div>
                    
                    <div className="images-grid">
                        {images.map((image) => (
                            <div key={image.id} className="image-card">
                                <div className="image-preview">
                                    <img src={image.preview} alt="미리보기" />
                                    <button 
                                        className="remove-btn"
                                        onClick={() => removeImage(image.id)}
                                        title="이미지 제거"
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div className="image-inputs">
                                    <div className="input-group">
                                        <label htmlFor={`key1-${image.id}`}>Key 1:</label>
                                        <input
                                            id={`key1-${image.id}`}
                                            type="text"
                                            value={image.key_1}
                                            onChange={(e) => updateImageKey(image.id, 'key_1', e.target.value)}
                                            placeholder="Key 1 입력"
                                        />
                                    </div>
                                    
                                    <div className="input-group">
                                        <label htmlFor={`key2-${image.id}`}>Key 2:</label>
                                        <input
                                            id={`key2-${image.id}`}
                                            type="text"
                                            value={image.key_2}
                                            onChange={(e) => updateImageKey(image.id, 'key_2', e.target.value)}
                                            placeholder="Key 2 입력"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
