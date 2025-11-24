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
 * Generates HTML string with diff highlights for the given text compared to all texts.
 * @param {string} currentText - The text to display and highlight.
 * @param {string[]} allTexts - Array of ALL texts (including current) to compare against.
 * @returns {string} HTML string with <span class="diff-highlight"> wrapping changed parts.
 */
export function generateDiffHtml(currentText, allTexts) {
  if (!currentText) return '';
  if (!allTexts || allTexts.length <= 1) {
    // Only one text total (or no texts), just format BREAK and return
    return formatBreak(currentText);
  }
  
  // Tokenize logic: Split by comma OR BREAK, capturing the delimiters.
  const splitRegex = /(\s*,\s*|\s*\bBREAK\b\s*)/;
  
  // Split and filter out empty strings
  const currentParts = currentText.split(splitRegex).filter(p => p.length > 0);
  
  // Create Sets for all texts (tokenize each text)
  const allTokenSets = allTexts.map(text => {
    if (!text) return new Set();
    const parts = text.split(splitRegex);
    // Filter: keep only "content" tokens (not delimiters, not empty)
    return new Set(parts.filter(p => !p.match(splitRegex) && p.trim().length > 0).map(p => p.trim()));
  });
  
  // Find common tokens: tokens that exist in ALL texts
  // Start with first set, then filter to only tokens present in all other sets
  const commonTokens = allTokenSets.length > 0 
    ? new Set([...allTokenSets[0]].filter(token => 
        allTokenSets.every(set => set.has(token))
      ))
    : new Set();
  
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
      
      // Highlight if NOT in common tokens
      // (i.e., not present in ALL images)
      const isDiff = !commonTokens.has(trimmedPart);
      
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
