/**
 * Generates HTML string with diff highlights for the given text compared to neighbor texts.
 * @param {string} currentText - The text to display and highlight.
 * @param {string[]} neighborTexts - Array of texts from neighboring items (prev/next) to compare against.
 * @returns {string} HTML string with <span class="diff-highlight"> wrapping changed parts.
 */
export function generateDiffHtml(currentText, neighborTexts) {
  if (!currentText) return '';
  if (!neighborTexts || neighborTexts.length === 0) return currentText; // Or should we return formatted text?
  // If no neighbors, we probably shouldn't highlight anything, but we still want the formatting (newlines).
  // However, the original logic returned early if no neighbors.
  // Let's assume if neighborTexts is empty, we just return formatted text without highlights.
  
  // Tokenize logic: Split by comma OR BREAK OR whitespace, capturing the delimiters.
  // We match:
  // 1. Comma with optional whitespace: \s*,\s*
  // 2. BREAK with optional whitespace: \s*\bBREAK\b\s* (using word boundary to avoid partial matches)
  // 3. Whitespace: \s+ (to split words)
  const splitRegex = /(\s*,\s*|\s*\bBREAK\b\s*|\s+)/;
  
  // Split and filter out empty strings resulting from adjacent delimiters
  const currentParts = currentText.split(splitRegex).filter(p => p.length > 0);
  
  // Create Sets for neighbors
  const neighborSets = neighborTexts.map(text => {
    if (!text) return new Set();
    const parts = text.split(splitRegex);
    // Filter: keep only "content" tokens (not delimiters, not empty)
    return new Set(parts.filter(p => !p.match(splitRegex) && p.trim().length > 0).map(p => p.trim()));
  });
  
  const resultParts = [];

  for (let i = 0; i < currentParts.length; i++) {
    const part = currentParts[i];
    
    // Check if this part is a delimiter
    if (part.match(splitRegex)) {
      // It's a delimiter (comma, BREAK, or whitespace).
      let displayPart = part;
      
      if (part.includes("BREAK")) {
          // Check next part for comma
          const nextPart = currentParts[i+1];
          const nextIsComma = nextPart && nextPart.match(/^\s*,\s*$/);
          
          if (nextIsComma) {
              displayPart = part; // Don't add <br> yet
          } else {
              displayPart = part.replace(/BREAK/, 'BREAK<br>');
          }
      } else if (part.match(/^\s*,\s*$/)) {
          // It's a comma. Check if PREVIOUS part was BREAK.
          const prevPart = currentParts[i-1];
          const prevIsBreak = prevPart && prevPart.includes("BREAK");
          
          if (prevIsBreak) {
              // Insert <br> after comma (e.g. ", " -> ",<br> ")
              displayPart = part.replace(',', ',<br>');
          }
      }
      
      resultParts.push(displayPart);
      
    } else {
      // It's a content token
      const trimmedPart = part.trim();
      if (trimmedPart.length === 0) {
        resultParts.push(part); // Preserve whitespace
        continue;
      }
      
      // Check for diff
      let isDiff = false;
      // If neighbors exist, check them.
      if (neighborSets.length > 0) {
        for (const neighborSet of neighborSets) {
            if (!neighborSet.has(trimmedPart)) {
                isDiff = true;
                break;
            }
        }
      }
      
      if (isDiff) {
        resultParts.push(`<span class="diff-highlight">${part}</span>`);
      } else {
        resultParts.push(part);
      }
    }
  }
  
  return resultParts.join('');
}
