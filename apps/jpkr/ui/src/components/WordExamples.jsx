import React from 'react';
import './WordExamples.css';

const WordExamples = ({ wordsSet }) => {
  if (!wordsSet || Object.keys(wordsSet).length === 0) {
    return null;
  }

  const copyToClipboard = () => {
    try {
      // TSV 헤더 생성
      const headers = ['ID','단어(기본형)', '레벨', '발음(히라가나)', '발음(한글)', '뜻(한국어)'];
      
      // TSV 데이터 생성
      const tsvData = Object.keys(wordsSet).map(word_id => 
          [
            word_id,
            wordsSet[word_id].word || '',
            wordsSet[word_id].level || '',
            wordsSet[word_id].jp_pronunciation || '',
            wordsSet[word_id].kr_pronunciation || '',
            wordsSet[word_id].kr_meaning || '',
          ].join('\t'))        

      // 헤더와 데이터를 결합
      const fullTsv = [headers.join('\t'), ...tsvData].join('\n');
      
      // 클립보드에 복사
      navigator.clipboard.writeText(fullTsv).then(() => {
        alert('TSV 형식으로 클립보드에 복사되었습니다!');
      }).catch(err => {
        console.error('클립보드 복사 실패:', err);
        alert('클립보드 복사에 실패했습니다.');
      });
    } catch (error) {
      console.error('TSV 변환 오류:', error);
      alert('데이터 변환 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="examples-section">
      <h2>단어별 예문</h2>
      <button onClick={copyToClipboard} className="copy-button">클립보드에 복사</button>
      <div className="examples-container">
        {Object.values(wordsSet).map((word, wordIndex) => (
          word.examples && (
            <div 
              key={`word-${wordIndex}`} 
              className="word-examples"
              style={word.images && word.images.length > 0 ? {
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)), url(${word.images[0]})`,
                backgroundSize: 'contain', // 'cover', 'contain', '100% 100%', 'auto' 중 선택
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              } : {}}
            >
              <div className="word-header">
                <div className="word-info">
                  <h3 className="word-title">
                    <span className="word-lemma">{word.word}</span>
                    <span className="word-level">({word.level})</span>
                  </h3>
                  <div className="word-details">
                    <span className="word-pronunciation">{word.jp_pronunciation}</span>
                    <span className="word-pronunciation">{word.kr_pronunciation}</span>
                    <span className="word-meaning">{word.kr_meaning}</span>
                  </div>
                </div>
              </div>
              <div className="examples-list">
                {word.examples.map((example, exampleIndex) => (
                  <div key={`example-${wordIndex}-${exampleIndex}`} className="example-item">
                    <div className="example-japanese">
                      {example.jp_text}
                    </div>
                    <div className="example-korean">
                      {example.kr_meaning}
                    </div>
                    {example.tags && example.tags.trim() && (
                      <div className="example-tags">
                        {example.tags.split(',').map((tag, tagIndex) => (
                          <span key={`tag-${wordIndex}-${exampleIndex}-${tagIndex}`} className="tag">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default WordExamples;
