import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAllUserDataAdmin, getAllUserDataUser } from '../api/api';
import EditableTable from '../components/EditableTable';
import Pagination from '../components/Pagination';
import './UserDetail.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const UserDetail = () => {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    
    // 페이지네이션 상태
    const [wordsPage, setWordsPage] = useState(1);
    const [examplesPage, setExamplesPage] = useState(1);
    const [skillsPage, setSkillsPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                let response;
                if (userId === "me") {
                    response = await getAllUserDataUser();
                } else {
                    response = await getAllUserDataAdmin(userId);
                }
                setUserData(response.data);
                setError(null);
            } catch (err) {
                setError('사용자 데이터를 불러오는데 실패했습니다.');
                console.error('Error fetching user data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchUserData();
        }
    }, [userId]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('ko-KR');
    };

    const aggregateSkillScoresByRange = (skills) => {
        if (!skills || !skills.length) return [];

        const ranges = [
            { name: '0-20', min: 0, max: 20 },
            { name: '21-40', min: 21, max: 40 },
            { name: '41-60', min: 41, max: 60 },
            { name: '61-80', min: 61, max: 80 },
            { name: '81-100', min: 81, max: 100 }
        ];

        const skillAreas = [
            { key: 'skill_kanji', label: '한자' },
            { key: 'skill_word_reading', label: '읽기(단어)' },
            { key: 'skill_word_speaking', label: '말하기(단어)' },
            { key: 'skill_sentence_reading', label: '읽기(문장)' },
            { key: 'skill_sentence_speaking', label: '말하기(문장)' },
            { key: 'skill_sentence_listening', label: '듣기(문장)' }
        ];

        return ranges.map(range => {
            const data = { range: range.name };
            
            skillAreas.forEach(area => {
                const count = skills.filter(skill => {
                    const score = skill[area.key];
                    return score >= range.min && score <= range.max;
                }).length;
                data[area.label] = count;
            });
            
            return data;
        });
    };

    const renderSkillHistogram = () => {
        if (!userData?.user_word_skills?.length) return null;

        const skillData = aggregateSkillScoresByRange(userData.user_word_skills);
        
        const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000', '#8dd1e1'];

        return (
            <div className="skill-histogram-section">
                <h3>스킬 점수 분포</h3>
                <div className="histogram-container">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={skillData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="한자" fill={colors[0]} />
                            <Bar dataKey="읽기(단어)" fill={colors[1]} />
                            <Bar dataKey="말하기(단어)" fill={colors[2]} />
                            <Bar dataKey="읽기(문장)" fill={colors[3]} />
                            <Bar dataKey="말하기(문장)" fill={colors[4]} />
                            <Bar dataKey="듣기(문장)" fill={colors[5]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="histogram-legend">
                    <p><strong>설명:</strong> 각 구간별로 6개 영역의 스킬 점수를 가진 단어의 수를 표시합니다.</p>
                    <p><strong>구간:</strong> 0-20 (초급), 21-40 (초중급), 41-60 (중급), 61-80 (중고급), 81-100 (고급)</p>
                </div>
            </div>
        );
    };


    const renderWords = () => {
        if (!userData?.words?.length) return null;

        const startIndex = (wordsPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentWords = userData.words.slice(startIndex, endIndex);
        const totalPages = Math.ceil(userData.words.length / itemsPerPage);

        const wordColumns = [
            { key: 'word', label: '단어' },
            { key: 'jp_pronunciation', label: '일본어 발음' },
            { key: 'kr_pronunciation', label: '한국어 발음' },
            { key: 'kr_meaning', label: '의미' },
            { key: 'level', label: '레벨' },
            { key: 'created_at', label: '생성일' }
        ];

        const formattedWords = currentWords.map(word => ({
            ...word,
            created_at: formatDate(word.created_at),
            level: `레벨 ${word.level}`
        }));

        return (
            <div className="words-section">
                <h2>단어 목록 ({userData.words.length}개)</h2>
                <EditableTable
                    columns={wordColumns}
                    data={formattedWords}
                    onDataChange={() => {}}
                    showAddRow={false}
                    showPasteButton={false}
                    showCopyButton={false}
                    showDeleteButton={false}
                    onUpdate={() => {}}
                />
                {totalPages > 1 && (
                    <Pagination
                        currentPage={wordsPage}
                        totalPages={totalPages}
                        onPageChange={setWordsPage}
                    />
                )}
            </div>
        );
    };

    const renderExamples = () => {
        if (!userData?.examples?.length) return null;

        const startIndex = (examplesPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentExamples = userData.examples.slice(startIndex, endIndex);
        const totalPages = Math.ceil(userData.examples.length / itemsPerPage);

        const exampleColumns = [
            { key: 'word', label: '단어' },
            { key: 'jp_text', label: '일본어' },
            { key: 'kr_meaning', label: '한국어 의미' },
            { key: 'tags', label: '태그' },
            { key: 'created_at', label: '생성일' }
        ];

        const formattedExamples = currentExamples.map(example => ({
            ...example,
            created_at: formatDate(example.created_at)
        }));

        return (
            <div className="examples-section">
                <h2>예문 목록 ({userData.examples.length}개)</h2>
                <EditableTable
                    columns={exampleColumns}
                    data={formattedExamples}
                    onDataChange={() => {}}
                    showAddRow={false}
                    showPasteButton={false}
                    showCopyButton={false}
                    showDeleteButton={false}
                    onUpdate={() => {}}
                />
                {totalPages > 1 && (
                    <Pagination
                        currentPage={examplesPage}
                        totalPages={totalPages}
                        onPageChange={setExamplesPage}
                    />
                )}
            </div>
        );
    };

    const renderImages = () => {
        if (!userData?.images?.length) return null;

        return (
            <div className="images-section">
                <h2>이미지 목록 ({userData.images.length}개)</h2>
                <div className="images-grid">
                    {userData.images.map((image) => (
                        <div key={image.id} className="image-card">
                            <div className="image-header">
                                <h3>이미지 #{image.id}</h3>
                                <span className="word-id">단어 ID: {image.word_id}</span>
                            </div>
                            <div className="image-content">
                                <img src={image.image_url} alt={`이미지 ${image.id}`} className="content-image" />
                                {image.tags && (
                                    <p><strong>태그:</strong> {image.tags}</p>
                                )}
                                <p><strong>생성일:</strong> {formatDate(image.created_at)}</p>
                                <p><strong>수정일:</strong> {formatDate(image.updated_at)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderUserWordSkills = () => {
        if (!userData?.user_word_skills?.length) return null;

        const startIndex = (skillsPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentSkills = userData.user_word_skills.slice(startIndex, endIndex);
        const totalPages = Math.ceil(userData.user_word_skills.length / itemsPerPage);

        const skillColumns = [
            { key: 'word', label: '단어' },
            { key: 'skill_kanji', label: '한자 스킬' },
            { key: 'skill_word_reading', label: '단어 읽기' },
            { key: 'skill_word_speaking', label: '단어 말하기' },
            { key: 'skill_sentence_reading', label: '문장 읽기' },
            { key: 'skill_sentence_speaking', label: '문장 말하기' },
            { key: 'skill_sentence_listening', label: '문장 듣기' },
            { key: 'is_favorite', label: '즐겨찾기' },
            { key: 'created_at', label: '생성일' }
        ];

        const formattedSkills = currentSkills.map(skill => ({
            ...skill,
            created_at: formatDate(skill.created_at),
            is_favorite: skill.is_favorite ? '⭐' : '-'
        }));

        return (
            <div className="skills-section">
                <h2>단어 스킬 목록 ({userData.user_word_skills.length}개)</h2>
                <EditableTable
                    columns={skillColumns}
                    data={formattedSkills}
                    onDataChange={() => {}}
                    showAddRow={false}
                    showPasteButton={false}
                    showCopyButton={false}
                    showDeleteButton={false}
                    onUpdate={() => {}}
                />
                {totalPages > 1 && (
                    <Pagination
                        currentPage={skillsPage}
                        totalPages={totalPages}
                        onPageChange={setSkillsPage}
                    />
                )}
            </div>
        );
    };

    const renderUserTexts = () => {
        if (!userData?.user_texts?.length) return null;

        return (
            <div className="texts-section">
                <h2>텍스트 목록 ({userData.user_texts.length}개)</h2>
                <div className="texts-grid">
                    {userData.user_texts.map((text) => (
                        <div key={text.id} className="text-card">
                            <div className="text-header">
                                <h3>{text.title}</h3>
                                <span className="text-id">ID: {text.id}</span>
                            </div>
                            <div className="text-content">
                                <div className="text-body">
                                    <p><strong>내용:</strong></p>
                                    <div className="text-content-body">{text.text}</div>
                                </div>
                                {text.tags && (
                                    <p><strong>태그:</strong> {text.tags}</p>
                                )}
                                {text.youtube_url && (
                                    <p><strong>YouTube URL:</strong> <a href={text.youtube_url} target="_blank" rel="noopener noreferrer">{text.youtube_url}</a></p>
                                )}
                                {text.audio_url && (
                                    <p><strong>오디오 URL:</strong> <a href={text.audio_url} target="_blank" rel="noopener noreferrer">{text.audio_url}</a></p>
                                )}
                                <p><strong>생성일:</strong> {formatDate(text.created_at)}</p>
                                <p><strong>수정일:</strong> {formatDate(text.updated_at)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderOverview = () => {
        if (!userData) return null;

        const stats = {
            words: userData.words?.length || 0,
            examples: userData.examples?.length || 0,
            images: userData.images?.length || 0,
            skills: userData.user_word_skills?.length || 0,
            texts: userData.user_texts?.length || 0,
            roles: userData.user_roles?.length || 0,
            favorites: userData.user_word_skills?.filter(skill => skill.is_favorite).length || 0
        };

        return (
            <div className="overview-section">
                <h2>전체 개요</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>단어</h3>
                        <span className="stat-number">{stats.words}</span>
                    </div>
                    <div className="stat-card">
                        <h3>예문</h3>
                        <span className="stat-number">{stats.examples}</span>
                    </div>
                    <div className="stat-card">
                        <h3>이미지</h3>
                        <span className="stat-number">{stats.images}</span>
                    </div>
                    <div className="stat-card">
                        <h3>스킬</h3>
                        <span className="stat-number">{stats.skills}</span>
                    </div>
                    <div className="stat-card">
                        <h3>텍스트</h3>
                        <span className="stat-number">{stats.texts}</span>
                    </div>
                    <div className="stat-card">
                        <h3>역할</h3>
                        <span className="stat-number">{stats.roles}</span>
                    </div>
                    <div className="stat-card">
                        <h3>즐겨찾기</h3>
                        <span className="stat-number">{stats.favorites}</span>
                    </div>
                </div>

                {/* 사용자 정보 섹션 */}
                {userData?.user && (
                    <div className="user-info-section">
                        <h3>사용자 정보</h3>
                        <div className="user-info-grid">
                            <div className="info-item">
                                <label>ID:</label>
                                <span>{userData.user.id}</span>
                            </div>
                            <div className="info-item">
                                <label>이메일:</label>
                                <span>{userData.user.email}</span>
                            </div>
                            <div className="info-item">
                                <label>표시명:</label>
                                <span>{userData.user.display_name || '-'}</span>
                            </div>
                            <div className="info-item">
                                <label>이메일 인증:</label>
                                <span>{userData.user.email_verified_at ? formatDate(userData.user.email_verified_at) : '미인증'}</span>
                            </div>
                            <div className="info-item">
                                <label>활성 상태:</label>
                                <span className={`status ${userData.user.is_active ? 'active' : 'inactive'}`}>
                                    {userData.user.is_active ? '활성' : '비활성'}
                                </span>
                            </div>
                            <div className="info-item">
                                <label>가입일:</label>
                                <span>{formatDate(userData.user.created_at)}</span>
                            </div>
                            <div className="info-item">
                                <label>수정일:</label>
                                <span>{formatDate(userData.user.updated_at)}</span>
                            </div>
                            {userData.user.picture_url && (
                                <div className="info-item">
                                    <label>프로필 이미지:</label>
                                    <img src={userData.user.picture_url} alt="프로필" className="profile-image" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 사용자 역할 섹션 */}
                {userData?.user_roles?.length > 0 && (
                    <div className="user-roles-section">
                        <h3>사용자 역할</h3>
                        <div className="roles-list">
                            {userData.user_roles.map((role, index) => (
                                <div key={index} className="role-item">
                                    <span className="role-id">ID: {role.role_id}</span>
                                    <span className="role-name">{role.role_name || '이름 없음'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 스킬 히스토그램 섹션 */}
                {renderSkillHistogram()}
            </div>
        );
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // 탭 변경 시 페이지네이션 초기화
        setWordsPage(1);
        setExamplesPage(1);
        setSkillsPage(1);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return renderOverview();
            case 'words':
                return renderWords();
            case 'examples':
                return renderExamples();
            case 'images':
                return renderImages();
            case 'skills':
                return renderUserWordSkills();
            case 'texts':
                return renderUserTexts();
            default:
                return renderOverview();
        }
    };

    if (loading) {
        return (
            <div className="user-detail-container">
                <div className="loading">데이터를 불러오는 중...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-detail-container">
                <div className="error">{error}</div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="user-detail-container">
                <div className="error">사용자 데이터를 찾을 수 없습니다.</div>
            </div>
        );
    }

    return (
        <div className="user-detail-container">
            <div className="user-detail-header">
                <h1>사용자 상세 정보</h1>
                <p>사용자 ID: {userId}</p>
            </div>

            <div className="tab-navigation">
                <button 
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => handleTabChange('overview')}
                >
                    개요
                </button>
                <button 
                    className={`tab-button ${activeTab === 'words' ? 'active' : ''}`}
                    onClick={() => handleTabChange('words')}
                >
                    단어
                </button>
                <button 
                    className={`tab-button ${activeTab === 'examples' ? 'active' : ''}`}
                    onClick={() => handleTabChange('examples')}
                >
                    예문
                </button>
                <button 
                    className={`tab-button ${activeTab === 'images' ? 'active' : ''}`}
                    onClick={() => handleTabChange('images')}
                >
                    이미지
                </button>
                <button 
                    className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
                    onClick={() => handleTabChange('skills')}
                >
                    스킬
                </button>
                <button 
                    className={`tab-button ${activeTab === 'texts' ? 'active' : ''}`}
                    onClick={() => handleTabChange('texts')}
                >
                    텍스트
                </button>
            </div>

            <div className="tab-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default UserDetail;
