"""
UserService 사용 예시
이 파일은 UserService를 어떻게 사용하는지 보여주는 예시입니다.
"""

from app.db import SessionLocal
from app.service.user_sevice import UserService


def example_get_user_data():
    """사용자와 연관된 모든 데이터를 가져오는 예시"""
    
    # 데이터베이스 세션 생성
    db = SessionLocal()
    
    try:
        # 사용자 ID (실제 사용할 때는 파라미터로 받거나 다른 방법으로 가져와야 함)
        user_id = "your-user-id-here"
        
        # 모든 데이터 가져오기
        user_data = UserService.get_user_with_all_data(db, user_id)
        
        if user_data:
            print("사용자 데이터를 성공적으로 가져왔습니다!")
            print(f"사용자 이메일: {user_data['user']['email']}")
            print(f"총 단어 수: {len(user_data['words'])}")
            print(f"총 예문 수: {len(user_data['examples'])}")
            print(f"총 이미지 수: {len(user_data['images'])}")
            print(f"총 텍스트 수: {len(user_data['user_texts'])}")
            print(f"즐겨찾기 단어 수: {len([s for s in user_data['user_word_skills'] if s['is_favorite']])}")
        else:
            print("사용자를 찾을 수 없습니다.")
            
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        
    finally:
        # 데이터베이스 세션 닫기
        db.close()


def example_get_user_summary():
    """사용자 요약 정보만 가져오는 예시"""
    
    db = SessionLocal()
    
    try:
        user_id = "your-user-id-here"
        
        # 요약 정보만 가져오기
        user_summary = UserService.get_user_summary(db, user_id)
        
        if user_summary:
            print("사용자 요약 정보:")
            print(f"이메일: {user_summary['email']}")
            print(f"표시명: {user_summary['display_name']}")
            print(f"활성 상태: {user_summary['is_active']}")
            print(f"가입일: {user_summary['created_at']}")
            print("통계:")
            print(f"  - 총 단어 수: {user_summary['stats']['total_words']}")
            print(f"  - 총 예문 수: {user_summary['stats']['total_examples']}")
            print(f"  - 총 이미지 수: {user_summary['stats']['total_images']}")
            print(f"  - 총 텍스트 수: {user_summary['stats']['total_texts']}")
            print(f"  - 즐겨찾기 단어 수: {user_summary['stats']['favorite_words']}")
        else:
            print("사용자를 찾을 수 없습니다.")
            
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        
    finally:
        db.close()


if __name__ == "__main__":
    print("=== UserService 사용 예시 ===")
    print()
    
    print("1. 모든 데이터 가져오기:")
    example_get_user_data()
    print()
    
    print("2. 요약 정보만 가져오기:")
    example_get_user_summary()
