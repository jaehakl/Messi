import { useEffect, useState } from "react";
import { API_URL, fetchMe, startGoogleLogin, logout } from "../../api";
import './AuthUserProfile.css';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from "react-router-dom";

function AuthUserProfile() {
  const { user, setUser } = useUser();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const data = await fetchMe();
      setUser(data);
      setLoading(false);
    })();
  }, []);
    

  if (loading) return <div className="sidebar-loading">Loading…</div>;

  return (
    <div className="sidebar-user-profile">
      {!user ? (
        <div className="login-section">
          <p className="login-text">로그인이 필요합니다</p>
          <button className="action-button primary" onClick={startGoogleLogin}>
            Google로 로그인
          </button>
        </div>
      ) : (
        <>
          {/* 컴팩트한 사용자 프로필 */}
          <div className="user-profile-compact">
            <div className="user-header">
              <div className="user-avatar-small">
                {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-details">
                <h4 className="user-name">{user.display_name || '이름 없음'}</h4>
                <p className="user-email-compact">{user.email || '이메일 없음'}</p>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="profile-actions">
              <button
                className="action-button primary"
                onClick={() => navigate(`/user-detail/me`)}
              >
                내 정보
              </button>
              <button 
                className="action-button secondary"
                onClick={async () => { 
                  await logout(); 
                  setUser(null); 
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AuthUserProfile;
