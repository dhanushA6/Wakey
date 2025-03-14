import React, { useState, useEffect, useRef } from 'react';
import './TamilTypingTest.css';
import phoneticMap from './phoneticMap.json';  
import levelContent from './levelContent' 
import getTamilToEnglishMap  from './utils/getTamilToEnglishMap';
import convertToTamil from './utils/convertToTamil'

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
  const [tamilCharMap, setTamilCharMap] = useState([]); // Map between tamil chars and english key sequences

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const keyFeedbackTimerRef = useRef(null);



  // Generate expected keys for the current level item
  useEffect(() => {
    if (gameActive && levelContent[currentLevel - 1]) {
      const currentItem = levelContent[currentLevel - 1].content[currentItemIndex];
      const tamilToEnglishMap = getTamilToEnglishMap(phoneticMap);
      
      // Analysis to break down Tamil characters into keystrokes
      const expectedKeySequence = [];
      const charMap = []; // Track which Tamil char s correspond to which English keys
      let i = 0;
      while (i < currentItem.length) {
        // Check for compound characters (first try 3, then 2, then 1)
        let found = false;
        for (let len = 4; len >= 1; len--) {
          if (i + len <= currentItem.length) {
            const tamilChar = currentItem.substring(i, i + len);
            if (tamilToEnglishMap[tamilChar]) {
              const englishSeq = tamilToEnglishMap[tamilChar];
              const startIndex = expectedKeySequence.length;
              
              // Add each individual key in the sequence
              for (let j = 0; j < englishSeq.length; j++) {
                expectedKeySequence.push(englishSeq[j]);
              }
              
              // Record the mapping between Tamil char and its English keys
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
        

        // If no mapping found, just add the character as is (for spaces, etc.)
        if (!found) {
          const startIndex = expectedKeySequence.length;
          expectedKeySequence.push(currentItem[i]);
          
          // Record the mapping for non-Tamil characters (like spaces)
          charMap.push({
            tamilChar: currentItem[i],
            startIndex,
            endIndex: startIndex,
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
        // Initialize with 'pending' status for each character
        const initialFeedback = charMap.map(char => ({ 
          char: char.tamilChar, 
          status: 'pending'
        }));
        setParagraphFeedback(initialFeedback);
      }
      
      if (expectedKeySequence.length > 0) {
        setHighlightedKey(expectedKeySequence[0]);
      }
    }
  }, [gameActive, currentLevel, currentItemIndex]);

  // Effect for handling Shift key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Shift") setShiftOn(true);
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
  }, []); 


  // Show feedback when a key is pressed (green for correct, red for wrong)
  const showKeyFeedback = (key, status) => {
    setKeyFeedback({ key, status });
    
    // Clear previous timer if exists
    if (keyFeedbackTimerRef.current) {
      clearTimeout(keyFeedbackTimerRef.current);
    }
    
    // Clear feedback after 1 second
    keyFeedbackTimerRef.current = setTimeout(() => {
      setKeyFeedback({ key: '', status: '' });
    }, 1000);
  };

  // Update paragraph feedback for levels 4+
  const updateParagraphFeedback = (keyIndex, isCorrect) => {
    if (currentLevel < 4) return;
    
    // Find which Tamil character this keyIndex belongs  
    const charInfo = tamilCharMap.find(
      char => keyIndex >= char.startIndex && keyIndex <= char.endIndex
    );
    
    if (charInfo) {
      const charIndex = tamilCharMap.indexOf(charInfo);
      
      // If this is the last key for this character, update its feedback status
      if (keyIndex === charInfo.endIndex) {
        setParagraphFeedback(prev => {
          const newFeedback = [...prev];
          newFeedback[charIndex] = {
            char: charInfo.tamilChar,
            status: isCorrect ? 'correct' : 'wrong'
          };
          return newFeedback;
        });
      }
      // If it's a partial keypress for a multi-key Tamil char, we could show "in progress" status
      else if (keyIndex < charInfo.endIndex) {
        setParagraphFeedback(prev => {
          const newFeedback = [...prev];
          newFeedback[charIndex] = {
            char: charInfo.tamilChar, 
            status: 'partial'
          };
          return newFeedback;
        });
      }
    }
  };

  // Handle backspace for paragraph feedback
  const handleBackspace = () => {
    if (currentLevel < 4 || !gameActive) return;
    
    // Find which character we're currently at
    if (currentKeyIndex > 0) {
      const newKeyIndex = currentKeyIndex - 1;
      setCurrentKeyIndex(newKeyIndex);
      setHighlightedKey(expectedKeys[newKeyIndex]);
      
      // Find which Tamil character this belongs to
      const charInfo = tamilCharMap.find(
        char => newKeyIndex >= char.startIndex && newKeyIndex <= char.endIndex
      );
      
      if (charInfo) {
        const charIndex = tamilCharMap.indexOf(charInfo);
        
        // Reset the status of this character to pending
        setParagraphFeedback(prev => {
          const newFeedback = [...prev];
          newFeedback[charIndex] = {
            char: charInfo.tamilChar,
            status: 'pending'
          };
          return newFeedback;
        });
      }
      
      // Update the input text
      setInputText(prev => prev.slice(0, -1));
      setTamilText(prev => convertToTamil(inputText.slice(0, -1)));
    }
  };

  // Handle key press and advance to next key
  const processKeyPress = (pressedKey) => {
    if (!gameActive) return;
    
    // For levels 1-3, only allow guided keys
    if (currentLevel <= 3) {
      const expectedKey = expectedKeys[currentKeyIndex];
      
      if (pressedKey === expectedKey) {
        // Correct key pressed
        setWrongKeyPressed('');
        setCorrectKeysPressed(prev => prev + 1);
        setInputText(prev => prev + pressedKey);
        setTamilText(prev => convertToTamil(inputText + pressedKey));
        
        // Show green feedback
        showKeyFeedback(pressedKey, 'correct');
        
        // Move to next key
        if (currentKeyIndex < expectedKeys.length - 1) {
          const nextKeyIndex = currentKeyIndex + 1;
          setCurrentKeyIndex(nextKeyIndex);
          setHighlightedKey(expectedKeys[nextKeyIndex]);
        } else {
          // Completed current item
          setHighlightedKey('');
          
          // Move to next item or level after a short delay
          setTimeout(() => {
            if (currentItemIndex < levelContent[currentLevel - 1].content.length - 1) {
              // Move to next item in current level
              setCurrentItemIndex(prev => prev + 1);
              setInputText('');
              setTamilText('');
            } else if (currentLevel < levelContent.length) {
              // Move to next level
              setCurrentLevel(prev => prev + 1);
              setCurrentItemIndex(0);
              setInputText('');
              setTamilText('');
            }
          }, 500);
        }
      } else {
        // Wrong key pressed
        setWrongKeyPressed(pressedKey);
        setErrorCount(prev => prev + 1);
        
        // Show red feedback
        showKeyFeedback(pressedKey, 'wrong');
      }
    } else {
      // Levels 4 and above - guided paragraph typing with ability to continue after wrong key
      const expectedKey = expectedKeys[currentKeyIndex];
      
      if (pressedKey.length === 1) { // Only process printable characters
        if (pressedKey === expectedKey) {
          // Correct key pressed
          setWrongKeyPressed('');
          setCorrectKeysPressed(prev => prev + 1);
          setInputText(prev => prev + pressedKey);
          setTamilText(prev => convertToTamil(inputText + pressedKey));
          
          // Show green feedback
          showKeyFeedback(pressedKey, 'correct');
          
          // Update paragraph feedback
          updateParagraphFeedback(currentKeyIndex, true);
          
          // Move to next key
          if (currentKeyIndex < expectedKeys.length - 1) {
            const nextKeyIndex = currentKeyIndex + 1;
            setCurrentKeyIndex(nextKeyIndex);
            setHighlightedKey(expectedKeys[nextKeyIndex]);
          } else {
            // Completed current item
            setHighlightedKey('');
            
            // Move to next item or level after a short delay
            setTimeout(() => {
              if (currentItemIndex < levelContent[currentLevel - 1].content.length - 1) {
                // Move to next item in current level
                setCurrentItemIndex(prev => prev + 1);
                setInputText('');
                setTamilText('');
              } else if (currentLevel < levelContent.length) {
                // Move to next level
                setCurrentLevel(prev => prev + 1);
                setCurrentItemIndex(0);
                setInputText('');
                setTamilText('');
              }
            }, 500);
          }
        } else {
          // Wrong key pressed - but at level 4+ we still advance to next key
          setWrongKeyPressed(pressedKey);
          setErrorCount(prev => prev + 1);
          
          // Show red feedback
          showKeyFeedback(pressedKey, 'wrong');
          
          // Update paragraph feedback to show the error
          updateParagraphFeedback(currentKeyIndex, false);
          
          // For levels 4+, we still allow user to continue by moving to next key
          if (currentLevel >= 4 && currentKeyIndex < expectedKeys.length - 1) {
            const nextKeyIndex = currentKeyIndex + 1;
            setCurrentKeyIndex(nextKeyIndex);
            setHighlightedKey(expectedKeys[nextKeyIndex]);
            
            // Add the key they pressed to the input (even though it's wrong)
            setInputText(prev => prev + pressedKey);
            setTamilText(prev => convertToTamil(inputText + pressedKey));
          } else if (currentLevel >= 4 && currentKeyIndex === expectedKeys.length - 1) {
            // Last key in sequence, move to next item
            setHighlightedKey('');
            
            // Move to next item or level after a short delay
            setTimeout(() => {
              if (currentItemIndex < levelContent[currentLevel - 1].content.length - 1) {
                // Move to next item in current level
                setCurrentItemIndex(prev => prev + 1);
                setInputText('');
                setTamilText('');
              } else if (currentLevel < levelContent.length) {
                // Move to next level
                setCurrentLevel(prev => prev + 1);
                setCurrentItemIndex(0);
                setInputText('');
                setTamilText('');
              }
            }, 500);
          }
        }
      }
    }
  };

  // Process keystrokes for guided typing
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gameActive) return;
      
      // Handle backspace for levels 4 and above
      if (e.key === "Backspace" && currentLevel >= 4) {
        handleBackspace();
        return;
      }
      
      // Only process regular keys (not modifiers, etc.)
      if (e.key.length === 1 || e.key === " ") {
        processKeyPress(e.key);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameActive, expectedKeys, currentKeyIndex, inputText, currentLevel, currentItemIndex, tamilCharMap]);

  const startGame = () => {
    setGameActive(true);
    setGameComplete(false);
    setInputText('');
    setTamilText('');
    setTimeLeft(60);
    setCurrentLevel(1);
    setCurrentItemIndex(0);
    setCorrectKeysPressed(0);
    setErrorCount(0);
    setWrongKeyPressed('');
    setKeyFeedback({ key: '', status: '' });
    setParagraphFeedback([]);

    inputRef.current?.focus();
    
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameActive(false);
          setGameComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };



  const handleInputChange = (e) => {
    // We're not using manual input anymore, even for higher levels
    // All levels use guided typing now
    return;
  };

  // Handle clicking on virtual keyboard
  const handleKeyPress = (keyValue) => {
    if (!gameActive) return;
    
    if (keyValue === "Shift") {
      setShiftOn(prev => !prev);
      return;
    }
    
    if (keyValue === "Backspace" && currentLevel >= 4) {
      handleBackspace();
      return;
    }
    
    if (keyValue === "Space") {
      keyValue = " ";
    }
    
    processKeyPress(keyValue);
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (keyFeedbackTimerRef.current) {
        clearTimeout(keyFeedbackTimerRef.current);
      }
    }
  }, []);

  const KeyboardTabs = () => (
    <div className="keyboard-tabs">
      <button
        className={`tab ${!shiftOn ? 'active' : ''}`}
        onClick={() => setShiftOn(false)}
      >
        Normal
      </button>
      <button
        className={`tab ${shiftOn ? 'active' : ''}`}
        onClick={() => setShiftOn(true)}
      >
        Shifted
      </button> 
    </div>
  );

  const keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];

  const renderKey = (key) => {
    const displayKey = shiftOn ? key.toUpperCase() : key;
    const tamilChar = phoneticMap[displayKey] || '';
    const isHighlighted = displayKey === highlightedKey; 
    const isWrong = displayKey === wrongKeyPressed;
    const hasFeedback = keyFeedback.key === displayKey;
    
    let keyClass = "key";
    if (isHighlighted) keyClass += " highlighted";
    if (isWrong) keyClass += " wrong";
    if (hasFeedback) {
      keyClass += keyFeedback.status === 'correct' ? " correct-feedback" : " wrong-feedback";
    }
    
    return (
      <button
        key={key}
        className={keyClass}
        onClick={() => handleKeyPress(displayKey)}
        disabled={!gameActive}
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
 
  const specialKeys = [
    { key: 'Shift', width: '80px' },
    { key: 'Space', width: '200px' },
    { key: 'Backspace', width: '100px' }
  ];

  const renderCurrentWord = () => {
    if (!gameActive || !levelContent[currentLevel - 1]) return null;
    
    const currentItem = levelContent[currentLevel - 1].content[currentItemIndex];
    
    // For levels 1-3, use character highlighting
    if (currentLevel <= 3) {
      // Break down the word into characters and highlight the current one
      let characterIndex = 0;
      let keyIndex = 0;
      const characters = [];
      
      while (characterIndex < currentItem.length) {
        // Find which keys produce this character
        const tamilToEnglishMap = getTamilToEnglishMap(phoneticMap);
        let charLength = 1;
        
        // Try to find longest matching character (3, 2, or 1 units)
        for (let len = 3; len >= 1; len--) {
          if (characterIndex + len <= currentItem.length) {
            const tamilChar = currentItem.substring(characterIndex, characterIndex + len);
            if (tamilToEnglishMap[tamilChar]) {
              charLength = len;
              break;
            }
          }
        }
        
        const tamilChar = currentItem.substring(characterIndex, characterIndex + charLength);
        const keysForChar = tamilToEnglishMap[tamilChar] || '';
        
        // Calculate if this character is the current focus
        const isCurrentChar = (keyIndex <= currentKeyIndex && currentKeyIndex < keyIndex + keysForChar.length);
        
        characters.push(
          <span 
            key={characterIndex} 
            className={isCurrentChar ? 'current-char' : ''}
          >
            {tamilChar}
          </span>
        );
        
        characterIndex += charLength;
        keyIndex += keysForChar.length;
      }
      
      return <div className="current-word">{characters}</div>;
    }
    
    // For levels 4 and above, use paragraph feedback
    return (
      <div className="current-word paragraph-mode">
        {paragraphFeedback.map((char, index) => (
          <span 
            key={index} 
            className={`paragraph-char ${char.status}`}
          >
            {char.char}
          </span>
        ))}
      </div>
    );
  };

  const renderResults = () => {
    if (!gameComplete) return null;
    
    const accuracy = correctKeysPressed > 0 
      ? Math.round((correctKeysPressed / (correctKeysPressed + errorCount)) * 100) 
      : 0;
    
    return (
      <div className="results">
        <h3>Typing Test Results</h3>
        <p>Level reached: {currentLevel}</p>
        <p>Accuracy: {accuracy}%</p>
        <p>Total correct keystrokes: {correctKeysPressed}</p>
        <p>Total errors: {errorCount}</p>
        <button className="start-button" onClick={startGame}>
          Try Again
        </button>
      </div>
    );
  };

  return (
    <div className="tamil-typing-test">
      <h1>தமிழ் தட்டச்சு பயிற்சி</h1>
      <h2>Tamil Typing Test</h2>
      
      <div className="game-container">
        <div className="game-info">
          <div className="time-section">Time: {timeLeft}s</div>
          {gameActive && (
            <div className="level-info">
              Level: {currentLevel} - {levelContent[currentLevel - 1]?.description}
            </div>
          )}
        </div>
        
        <div className="target-word">
          <h3>Type this:</h3>
          {renderCurrentWord()}
          {gameActive && (
            <div className="key-hint">
              Press <span className="highlighted-key">{highlightedKey || 'next key'}</span> on your keyboard
              {currentLevel >= 4 && <span className="level-note"> (Typing errors will show feedback but won't stop you)</span>}
            </div>
          )}
        </div>
        
        <div className="input-area">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type following the highlighted key..."
            disabled={true} // Always disabled now since we use guided typing
          />
          <div className="tamil-preview">
            {tamilText}
          </div>
        </div>
        
        {!gameActive && !gameComplete && (
          <button className="start-button" onClick={startGame}>
            Start Game
          </button>
        )}
        
        {gameComplete && renderResults()}
        
        <div className="keyboard">
          <KeyboardTabs />
          {keyboardRows.map((row, rowIndex) => (
            <div key={rowIndex} className="keyboard-row">
              {row.map(renderKey)}
            </div>
          ))}
          <div className="keyboard-row special-keys">
            {specialKeys.map(({key, width}) => {
              const isShiftHighlighted = key === 'Shift' && shiftOn;
              const isSpaceHighlighted = key === 'Space' && highlightedKey === ' ';
              const keyClass = `key special-key ${isShiftHighlighted ? 'active-shift' : ''} ${isSpaceHighlighted ? 'highlighted' : ''}`;
              
              return (
                <button
                  key={key}
                  className={keyClass}
                  style={{ width }}
                  onClick={() => handleKeyPress(key)}
                  disabled={!gameActive}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TamilTypingTest;