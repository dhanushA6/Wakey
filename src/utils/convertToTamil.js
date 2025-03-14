  
  import phoneticMap from '../phoneticMap.json'
  
  const convertToTamil = (text) => {
    let result = '';
    let i = 0;
     
    while (i < text.length) {
      if (i < text.length - 2) {
        const threeChars = text.substring(i, i + 3);
        if (phoneticMap[threeChars]) {
          result += phoneticMap[threeChars];
          i += 3;
          continue;
        }
      }
      
      if (i < text.length - 1) {
        const twoChars = text.substring(i, i + 2);
        if (phoneticMap[twoChars]) {
          result += phoneticMap[twoChars];
          i += 2;
          continue;
        }
      }
      
      const char = text[i];
      result += phoneticMap[char] || char;
      i++;
    }
    
    return result;
  }; 

  export default convertToTamil;