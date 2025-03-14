const getTamilToEnglishMap = (phoneticMap) => {
    const reverseMap = {};
    for (const [eng, tam] of Object.entries(phoneticMap)) {
      if (tam && tam.length > 0) { 
        reverseMap[tam] = eng;
      }
    }
    return reverseMap;
  }; 

  export default getTamilToEnglishMap;