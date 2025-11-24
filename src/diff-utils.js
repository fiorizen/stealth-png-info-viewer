/**
 * Formats BREAK keywords with line breaks.
 * @param {string} text - Text to format.
 * @returns {string} Formatted text with <br> tags after BREAK.
 */
function formatBreak(text) {
  // Replace "BREAK, " with "BREAK,<br>" (newline after comma)
  // Replace "BREAK " or "BREAK" at end with "BREAK<br>"
  return text.replace(/\bBREAK\s*,\s*/g, 'BREAK,<br>').replace(/\bBREAK(?:\s+|$)/g, 'BREAK<br>');
}

/**
 * Generates HTML string with diff highlights for the given text compared to neighbor texts.
 * @param {string} currentText - The text to display and highlight.
 * @param {string[]} neighborTexts - Array of texts from neighboring items (prev/next) to compare against.
 * @returns {string} HTML string with <span class="diff-highlight"> wrapping changed parts.
 */
export function generateDiffHtml(currentText, neighborTexts) {
  if (!currentText) return '';
  if (!neighborTexts || neighborTexts.length === 0) {
    // No neighbors, just format BREAK and return
    return formatBreak(currentText);
  }
  
  // Tokenize logic: Split by comma OR BREAK, capturing the delimiters.
  // We match:
  // 1. Comma with optional whitespace: \s*,\s*
  // 2. BREAK with optional whitespace: \s*\bBREAK\b\s*
  // NOTE: We do NOT split on whitespace to keep multi-word phrases together
  const splitRegex = /(\s*,\s*|\s*\bBREAK\b\s*)/;
  
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
      // It's a delimiter (comma or BREAK) - just pass through
      resultParts.push(part);
    } else {
      // It's a content token
      const trimmedPart = part.trim();
      if (trimmedPart.length === 0) {
        resultParts.push(part); // Preserve whitespace
        continue;
      }
      
      // Check for diff
      // A token should be highlighted if it's missing from ANY neighbor
      // (i.e., NOT present in ALL neighbors)
      let isDiff = false;
      if (neighborSets.length > 0) {
        // Check if the token exists in ALL neighbor sets
        const existsInAllNeighbors = neighborSets.every(neighborSet => neighborSet.has(trimmedPart));
        // If it doesn't exist in all neighbors, it's different
        isDiff = !existsInAllNeighbors;
      }
      
      if (isDiff) {
        resultParts.push(`<span class="diff-highlight">${part}</span>`);
      } else {
        resultParts.push(part);
      }
    }
  }
  
  // Apply BREAK formatting after diff highlighting
  return formatBreak(resultParts.join(''));
}
