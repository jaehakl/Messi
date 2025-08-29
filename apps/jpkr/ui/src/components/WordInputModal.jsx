import React, { useState, useEffect } from 'react';
import { to_hiragana } from '../service/hangul-to-hiragana';
import './WordInputModal.css';
import { useUser } from '../contexts/UserContext';

const WordInputModal = ({ word, isOpen, onClose, onSubmit, onDelete }) => {
  const { user } = useUser();
  const [wordForm, setWordForm] = useState({
    word: '',
    jp_pronunciation: '',
    kr_pronunciation: '',
    kr_meaning: '',
    level: 'N1',
    tags: '',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileTags, setFileTags] = useState([]);

  // word prop이 변경될 때마다 폼 데이터 초기화
  useEffect(() => {
    if (word) {
      const formData = {
        word: word.word || '',
        jp_pronunciation: word.jp_pronunciation || word.surface || '',
        kr_pronunciation: word.kr_pronunciation || '',
        kr_meaning: word.kr_meaning || '',
        level: word.level || 'N1',
        tags: word.tags || '',
      };
      setWordForm(formData);
    }
  }, [word]);

  // 폼 입력 처리
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'kr_pronunciation') {
      const kana = to_hiragana(value);
      setWordForm(prev => ({
        ...prev,
        'jp_pronunciation': kana,
        'kr_pronunciation': value
      }));
    } else {
      setWordForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // 파일 선택 처리
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    
    // 파일별로 태그 초기화
    const initialTags = files.map(file => ({
      word: wordForm.word,
      tags: wordForm.tags
    }));
    setFileTags(initialTags);
  };

  // 파일 태그 변경 처리
  const handleFileTagChange = (index, value) => {
    const newFileTags = [...fileTags];
    newFileTags[index] = { ...newFileTags[index], tags: value };
    setFileTags(newFileTags);
  };

  // 폼 제출 처리
  const handleSubmit = () => {
    if (!wordForm.word.trim()) {
      alert('단어를 입력해주세요.');
      return;
    }

    const newWord = {
      id: word?.id || Date.now(),
      ...wordForm,
      surface: wordForm.word,
      originalWord: word
    };

    // FormData 생성
    const fd = new FormData();
    fd.append("data_json", JSON.stringify([newWord]));
    
    // 파일 메타데이터 추가
    const fileMetaData = selectedFiles.map((file, index) => ({
      word: wordForm.word,
      tags: fileTags[index]?.tags || wordForm.tags
    }));
    fd.append("file_meta_json", JSON.stringify(fileMetaData));
    
    // 파일들 추가
    selectedFiles.forEach(file => {
      fd.append("files", file);
    });

    onSubmit(fd);
    handleClose();
  };

  // 삭제 처리
  const handleDelete = () => {
    if (window.confirm('정말로 이 단어를 삭제하시겠습니까?')) {
      onDelete(word.id);
      handleClose();
    }
  };

  // 모달 닫기
  const handleClose = () => {
    setWordForm({
      word: '',
      jp_pronunciation: '',
      kr_pronunciation: '',
      kr_meaning: '',
      level: 'N1',
      tags: '',
    });
    setSelectedFiles([]);
    setFileTags([]);
    onClose();
  };

  if (!isOpen) return null;

  return (    
    <div className="word-input-modal-overlay">
      <div className="word-input-modal-content">
        <div className="word-input-modal-body">
          <div className="word-input-modal-form-row">
            <div className="word-input-modal-form-group">
              <h2 className="word-input-modal-word">{wordForm.word}</h2>
            </div>
            <div className="word-input-modal-form-group">
              <label>일본어 발음:</label>
              <input
                type="text"
                name="jp_pronunciation"
                value={wordForm.jp_pronunciation}
                onChange={handleFormChange}
                placeholder="일본어 발음을 입력하세요"
              />
            </div>
          </div>
          <div className="word-input-modal-form-row">
          <div className="word-input-modal-form-group">
             <label>한국어 뜻:</label>
              <input
                type="text"
                name="kr_meaning"
                value={wordForm.kr_meaning}
                onChange={handleFormChange}
                placeholder="한국어 뜻을 입력하세요"
              />
            </div>

            <div className="word-input-modal-form-group">
              <label>한국어 발음:</label>
              <input
                type="text"
                name="kr_pronunciation"
                value={wordForm.kr_pronunciation}
                onChange={handleFormChange}
                placeholder="한국어 발음을 입력하세요"
              />
            </div>
          </div>
          <div className="word-input-modal-form-row">

            <div className="word-input-modal-form-group">
              <label>난이도:</label>
              <select
                name="level"
                value={wordForm.level}
                onChange={handleFormChange}                  
              >
                <option value="N/A">(N/A) 아주 쉬움</option>
                <option value="N5">(N5) 초급</option>
                <option value="N4">(N4) 초중급</option>
                <option value="N3">(N3) 중급</option>
                <option value="N2">(N2) 중고급</option>
                <option value="N1">(N1) 고급</option>
              </select>
            </div>
            <div className="word-input-modal-form-group">
              <label>이미지 파일:</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                placeholder="이미지 파일을 선택하세요"
              />
            </div>
            </div>
          {selectedFiles.length > 0 && (
            <div className="word-input-modal-form-group">
              <label>파일별 태그:</label>
              {selectedFiles.map((file, index) => (
                <div key={index} className="word-input-modal-file-tag-item">
                  <span className="word-input-modal-file-name">{file.name}</span>
                  <input
                    type="text"
                    value={fileTags[index]?.tags || ''}
                    onChange={(e) => handleFileTagChange(index, e.target.value)}
                    placeholder="태그를 입력하세요"
                    className="word-input-modal-file-tag-input"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="word-input-modal-footer">
          <div className="word-input-modal-footer-left">
            {word?.user_id === user?.id && (
              <button onClick={handleDelete} className="word-input-modal-delete-btn">
                삭제
              </button>
            )}
            {!(user && user.roles.includes('user')) && (
              <h5>로그인 후 저장 가능합니다.</h5>
            )}
          </div>
          <div className="word-input-modal-footer-right">
            <button onClick={handleClose} className="word-input-modal-cancel-btn">
              취소
            </button>
            {user && user.roles.includes('user') && (
            <button onClick={handleSubmit} className="word-input-modal-add-btn">
              {word?.user_id === user?.id ? '수정' : '추가'}
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordInputModal;
