from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class WordData(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    word: str
    jp_pronunciation: str
    kr_pronunciation: str
    kr_meaning: str
    level: str   
    num_examples: Optional[str] = None
    examples: Optional[List[Dict[str, Any]]] = None
    num_images: Optional[int] = None
    images: Optional[List[Dict[str, Any]]] = None

class ExampleData(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    word_id: str
    word_info: Optional[str] = None
    tags: str
    jp_text: str
    kr_meaning: str
    num_audio: Optional[int] = None
    audio: Optional[List[Dict[str, Any]]] = None

class UserWordSkillData(BaseModel):
    id: Optional[str] = None
    user_id: str
    user_name: Optional[str] = None
    word_id: str
    word_info: Optional[str] = None
    skill_kanji: Optional[int] = None
    skill_word_reading: Optional[int] = None
    skill_word_speaking: Optional[int] = None
    skill_sentence_reading: Optional[int] = None
    skill_sentence_speaking: Optional[int] = None
    skill_sentence_listening: Optional[int] = None
    is_favorite: Optional[bool] = None

class UserTextData(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    title: str
    text: Optional[str] = None
    tags: Optional[str] = None
    embedding: Optional[List[float]] = None
    youtube_url: Optional[str] = None
    audio_url: Optional[str] = None

class TextData(BaseModel):
    text: str

class UserData(BaseModel):
    id: str
    email: str
    display_name: str
    picture_url: str
    roles: List[str]

class UserSummaryData(BaseModel):
    id: str
    email: str
    display_name: str
    picture_url: str
    roles: List[str]
    num_texts: int
    num_words: int
    num_examples: int
    num_images: int

class WordImageOut(BaseModel):
    id: str
    word_id: str
    tags: str
    image_url: str  # (권장) 뷰 API에서 presigned GET으로 채워주기
    class Config:
        from_attributes = True
