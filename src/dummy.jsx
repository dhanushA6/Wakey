import React, { useState, useEffect, useRef } from 'react';
import './TamilTypingTest.css';
import phoneticMap from './phoneticMap.json';
import levelContent from './levelContent';
import getTamilToEnglishMap from './utils/getTamilToEnglishMap';
import convertToTamil from './utils/convertToTamil';

const TamilTypingTest = () => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [shiftOn, setShiftOn] = useState(false);
  const [inputText, setInputText] = useState('');
  const [tamilText, setTamilText] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameActive, setGameActive] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [expectedKeys, setExpectedKeys] = useState([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [highlightedKey, setHighlightedKey] = useState('');
  const [wrongKeyPressed, setWrongKeyPressed] = useState('');
  const [correctKeysPressed, setCorrectKeysPressed] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [keyFeedback, setKeyFeedback] = useState({ key: '', status: '' });
  const [paragraphFeedback, setParagraphFeedback] = useState([]);
  const [tamilCharMap, setTamilCharMap] = useState([]);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [levelMetrics, setLevelMetrics] = useState(null);
  const [errorByTamilChar, setErrorByTamilChar] = useState({});

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const keyFeedbackTimerRef = useRef(null);

  // Game initialization and keyboard mapping
  useEffect(() => {
    if (gameActive && levelContent[currentLevel - 1]) {
      const currentItem = levelContent[currentLevel - 1].content[currentItemIndex];
      const tamilToEnglishMap = getTamilToEnglishMap(phoneticMap);
      
      const expectedKeySequence = [];
      const charMap = [];
      let i = 0;
      
      while (i < currentItem.length) {
        let found = false;
        for (let len = 4; len >= 1; len--) {
          if (i + len <= currentItem.length) {
            const tamilChar = currentItem.substring(i, i + len);
            if (tamilToEnglishMap[tamilChar]) {
              const englishSeq = tamilToEnglishMap[tamilChar];
              const startIndex = expectedKeySequence.length;
              
              expectedKeySequence.push(...englishSeq);
              charMap.push({
                tamilChar,
                startIndex,
                endIndex: startIndex + englishSeq.length - 1,
                length: len,
                englishKeys: englishSeq
              });
              i += len;
              found = true;
              break;
            }
          }
        }

        if (!found) {
          expectedKeySequence.push(currentItem[i]);
          charMap.push({
            tamilChar: currentItem[i],
            startIndex: expectedKeySequence.length - 1,
            endIndex: expectedKeySequence.length - 1,
            length: 1,
            englishKeys: currentItem[i]
          });
          i++;
        }
      }
      
      setExpectedKeys(expectedKeySequence);
      setTamilCharMap(charMap);
      setCurrentKeyIndex(0);
      
      if (currentLevel >= 4) {
        setParagraphFeedback(charMap.map(char => ({ 
          char: char.tamilChar, 
          status: 'pending'
        })));
      }
      
      setHighlightedKey(expectedKeySequence[0] || '');
    }
  }, [gameActive, currentLevel, currentItemIndex]);

  // Physical keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Shift") setShiftOn(true);
      if (!gameActive) return;

      e.preventDefault();
      if (e.key === "Backspace") {
        handleBackspace();
        return;
      }
      
      if (e.key.length === 1 || e.key === " ") {
        const key = shiftOn ? e.key.toUpperCase() : e.key.toLowerCase();
        processKeyPress(key);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Shift") setShiftOn(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameActive, shiftOn, currentKeyIndex, expectedKeys]);

  // Focus management
  useEffect(() => {
    if (gameActive) inputRef.current?.focus();
  }, [gameActive]);

  // Timer management
  useEffect(() => {
    if (gameActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishLevel();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameActive]);

  // Game logic functions
  const processKeyPress = (pressedKey) => {
    const expectedKey = expectedKeys[currentKeyIndex];
    if (!expectedKey) return;

    if (pressedKey === expectedKey) {
      handleCorrectKey(pressedKey);
    } else {
      handleError(pressedKey);
    }
  };

  const handleCorrectKey = (key) => {
    setWrongKeyPressed('');
    setCorrectKeysPressed(prev => prev + 1);
    setInputText(prev => prev + key);
    setTamilText(prev => convertToTamil(inputText + key));
    
    showKeyFeedback(key, 'correct');
    updateParagraphFeedback(currentKeyIndex, true);

    if (currentKeyIndex < expectedKeys.length - 1) {
      const nextKeyIndex = currentKeyIndex + 1;
      setCurrentKeyIndex(nextKeyIndex);
      setHighlightedKey(expectedKeys[nextKeyIndex]);
    } else {
      setTimeout(() => advanceToNextSegment(), 500);
    }
  };

  const handleError = (pressedKey) => {
    setWrongKeyPressed(pressedKey);
    setErrorCount(prev => prev + 1);
    showKeyFeedback(pressedKey, 'wrong');

    const charInfo = tamilCharMap.find(
      char => currentKeyIndex >= char.startIndex && currentKeyIndex <= char.endIndex
    );
    if (charInfo) {
      setErrorByTamilChar(prev => ({
        ...prev,
        [charInfo.tamilChar]: (prev[charInfo.tamilChar] || 0) + 1
      }));
    }

    if (currentLevel >= 4) {
      updateParagraphFeedback(currentKeyIndex, false);
      if (currentKeyIndex < expectedKeys.length - 1) {
        const nextKeyIndex = currentKeyIndex + 1;
        setCurrentKeyIndex(nextKeyIndex);
        setHighlightedKey(expectedKeys[nextKeyIndex]);
        setInputText(prev => prev + pressedKey);
        setTamilText(prev => convertToTamil(inputText + pressedKey));
      }
    }
  };

  const handleBackspace = () => {
    if (currentLevel >= 4 && currentKeyIndex > 0) {
      const newKeyIndex = currentKeyIndex - 1;
      setCurrentKeyIndex(newKeyIndex);
      setHighlightedKey(expectedKeys[newKeyIndex]);
      setInputText(prev => prev.slice(0, -1));
      setTamilText(prev => convertToTamil(inputText.slice(0, -1)));

      const charInfo = tamilCharMap.find(
        char => newKeyIndex >= char.startIndex && newKeyIndex <= char.endIndex
      );
      if (charInfo) {
        setParagraphFeedback(prev => prev.map((item, idx) => 
          idx === tamilCharMap.indexOf(charInfo) 
            ? { ...item, status: 'pending' } 
            : item
        ));
      }
    }
  };

  // Game progression
  const advanceToNextSegment = () => {
    if (currentItemIndex < levelContent[currentLevel - 1].content.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else {
      finishLevel();
    }
    setInputText('');
    setTamilText('');
  };

  const finishLevel = () => {
    const timeElapsed = 60 - timeLeft;
    const wpm = Math.round((correctKeysPressed / 5) * (60 / timeElapsed)) || 0;
    const cpm = Math.round(correctKeysPressed * (60 / timeElapsed)) || 0;
    const accuracy = Math.round((correctKeysPressed / (correctKeysPressed + errorCount)) * 100) || 0;
    
    setLevelMetrics({ wpm, cpm, accuracy, errorByTamilChar });
    setGameActive(false);
    setLevelCompleted(true);
    clearInterval(timerRef.current);
  }; 

  // UI helper functions
  const showKeyFeedback = (key, status) => {
    setKeyFeedback({ key, status });
    clearTimeout(keyFeedbackTimerRef.current);
    keyFeedbackTimerRef.current = setTimeout(() => setKeyFeedback({ key: '', status: '' }), 1000);
  };

  const updateParagraphFeedback = (keyIndex, isCorrect) => {
    if (currentLevel < 4) return;
    
    const charInfo = tamilCharMap.find(
      char => keyIndex >= char.startIndex && keyIndex <= char.endIndex
    );
    
    if (charInfo) {
      setParagraphFeedback(prev => prev.map((item, idx) => 
        idx === tamilCharMap.indexOf(charInfo)
          ? { ...item, status: isCorrect ? 'correct' : 'wrong' }
          : item
      ));
    }
  };

  // Game control functions
  const startGame = () => {
    setGameActive(true);
    setGameComplete(false);
    setLevelCompleted(false);
    setTimeLeft(60);
    setCurrentLevel(1);
    setCurrentItemIndex(0);
    setCorrectKeysPressed(0);
    setErrorCount(0);
    setErrorByTamilChar({});
    inputRef.current?.focus();
  };

  const proceedToNextLevel = () => {
    if (currentLevel < levelContent.length) {
      setCurrentLevel(prev => prev + 1);
      setCurrentItemIndex(0);
      resetLevelState();
      setGameActive(true);
    }
  };

  const retryLevel = () => {
    resetLevelState();
    setGameActive(true);
  };

  const resetLevelState = () => {
    setInputText('');
    setTamilText('');
    setErrorByTamilChar({});
    setLevelCompleted(false);
    setLevelMetrics(null);
    setCorrectKeysPressed(0);
    setErrorCount(0);
    setTimeLeft(60);
    inputRef.current?.focus();
  };

  // Render components
  const KeyboardTabs = () => (
    <div className="keyboard-tabs">
      <button className={`tab ${!shiftOn ? 'active' : ''}`}>Normal</button>
      <button className={`tab ${shiftOn ? 'active' : ''}`}>Shifted</button>
    </div>
  );

  const renderKey = (key) => {
    const displayKey = shiftOn ? key.toUpperCase() : key;
    const tamilChar = phoneticMap[displayKey] || '';
    const isHighlighted = displayKey === highlightedKey;
    const hasFeedback = keyFeedback.key === displayKey;
    
    return (
      <button
        key={key}
        className={`key 
          ${isHighlighted ? 'highlighted' : ''}
          ${hasFeedback ? keyFeedback.status + '-feedback' : ''}
        `}
        tabIndex={-1}
      >
        {displayKey}
        <small style={{ 
          color: shiftOn ? '#4a2378' : '#5c2d91',
          fontWeight: shiftOn ? 'bold' : 'normal' 
        }}>
          {tamilChar}
        </small>
      </button>
    );
  };

  const renderCurrentWord = () => {
    if (!gameActive || !levelContent[currentLevel - 1]) return null;
    const currentItem = levelContent[currentLevel - 1].content[currentItemIndex];

    return currentLevel <= 3 ? (
      <div className="current-word">
        {Array.from(currentItem).map((char, index) => (
          <span key={index} className="tamil-char">{char}</span>
        ))}
      </div>
    ) : (
      <div className="current-word paragraph-mode">
        {paragraphFeedback.map((char, index) => (
          <span key={index} className={`paragraph-char ${char.status}`}>
            {char.char}
          </span>
        ))}
      </div>
    );
  };

  const renderLevelResults = () => {
    if (!levelCompleted || !levelMetrics) return null;
    const { wpm, cpm, accuracy, errorByTamilChar } = levelMetrics;
    const errorEntries = Object.entries(errorByTamilChar).sort((a, b) => b[1] - a[1]);

    return (
      <div className="level-results">
        <h3>Level {currentLevel} Results</h3>
        <div className="metrics">
          <p>WPM: <strong>{wpm}</strong></p>
          <p>CPM: <strong>{cpm}</strong></p>
          <p>Accuracy: <strong>{accuracy}%</strong></p>
        </div>
        <div className="error-analysis">
          <h4>Error Analysis</h4>
          {errorEntries.length > 0 ? (
            <ul>
              {errorEntries.map(([char, count]) => (
                <li key={char}>
                  <span className="tamil-char">{char}</span>: {count} errors
                </li>
              ))}
            </ul>
          ) : <p>Perfect! No errors! 🎉</p>}
        </div>
        <div className="level-actions">
          {accuracy >= 80 ? (
            currentLevel < levelContent.length ? (
              <>
                <button className="proceed-button" onClick={proceedToNextLevel}>
                  Next Level ➔
                </button>
                <button className="retry-button" onClick={retryLevel}>
                  Retry Level 🔄
                </button>
              </>
            ) : (
              <div className="completed-all">
                <p>🎉 All Levels Completed! 🎉</p>
                <button className="start-button" onClick={startGame}>
                  Play Again
                </button>
              </div>
            )
          ) : (
            <>
              <p className="accuracy-warning">Minimum 80% accuracy required</p>
              <button className="retry-button" onClick={retryLevel}>
                Retry Level 🔄
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="tamil-typing-test">
      <h1>தமிழ் தட்டச்சு பயிற்சி</h1>
      <h2>Tamil Typing Practice</h2>

      {!levelCompleted && !gameComplete && (
        <div className="game-container">
          <div className="game-info">
            <div className="time-section">Time: {timeLeft}s</div>
            {gameActive && (
              <div className="level-info">
                Level {currentLevel}: {levelContent[currentLevel - 1]?.description}
              </div>
            )}
          </div>

          <div className="target-word">
            <h3>Type This:</h3>
            {renderCurrentWord()}
            {gameActive && (
              <div className="key-hint">
                Next Key: <span className="highlighted-key">{highlightedKey || ' '}</span>
              </div>
            )}
          </div>

          <div className="input-area">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              readOnly
              placeholder="Start typing..."
              autoFocus
              className="hidden-input"
            />
            <div className="tamil-preview">{tamilText}</div>
          </div>

          <div className="keyboard reference-keyboard">
            <KeyboardTabs />
            {[['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l'], ['z','x','c','v','b','n','m']]
              .map((row, i) => (
                <div key={i} className="keyboard-row">
                  {row.map(renderKey)}
                </div>
              ))}
            <div className="keyboard-row special-keys">
              {['Shift', 'Space', 'Backspace'].map((key) => (
                <button
                  key={key}
                  className={`key special-key ${key === 'Shift' && shiftOn ? 'active-shift' : ''}`}
                  style={{ width: key === 'Space' ? '200px' : '80px' }}
                  tabIndex={-1}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {!gameActive && (
            <button className="start-button" onClick={startGame}>
              {levelCompleted ? 'Continue' : 'Start Game'}
            </button>
          )}
        </div>
      )}

      {levelCompleted && renderLevelResults()}
    </div>
  );
};

export default TamilTypingTest;