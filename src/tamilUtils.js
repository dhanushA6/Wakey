// Utility function to count Tamil letters
export const countTamilLetters = (word) => {
    // Tamil Unicode range (U+0B80 to U+0BFF)
    const tamilLetterPattern = /[\u0B80-\u0BFF][\u0B82-\u0BCD]?/g;
    const letters = word.match(tamilLetterPattern) || [];
    return letters.length;
  };
  