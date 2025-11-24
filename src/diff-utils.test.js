import { describe, expect, it } from 'vitest';
import { generateDiffHtml } from './diff-utils.js';

describe('generateDiffHtml', () => {
  it('should return original text if no neighbors', () => {
    const text = 'hello world';
    expect(generateDiffHtml(text, [])).toBe('hello world');
  });

  it('should highlight added words', () => {
    const current = 'hello world';
    const neighbor = 'hello';
    // "world" is missing in neighbor, so it should be highlighted
    const expected = 'hello <span class="diff-highlight">world</span>';
    expect(generateDiffHtml(current, [neighbor])).toBe(expected);
  });

  it('should highlight changed words', () => {
    const current = 'hello world';
    const neighbor = 'hello there';
    // "world" is missing in neighbor
    const expected = 'hello <span class="diff-highlight">world</span>';
    expect(generateDiffHtml(current, [neighbor])).toBe(expected);
  });

  it('should support bidirectional diff (highlight if missing in EITHER neighbor)', () => {
    const current = 'A B C';
    const prev = 'A C'; // Missing B
    const next = 'A B'; // Missing C
    
    // B is missing in prev -> Highlight B
    // C is missing in next -> Highlight C
    const expected = 'A <span class="diff-highlight">B</span> <span class="diff-highlight">C</span>';
    expect(generateDiffHtml(current, [prev, next])).toBe(expected);
  });

  it('should ignore whitespace changes', () => {
    const current = 'hello   world';
    const neighbor = 'hello world';
    // Whitespace difference should NOT be highlighted
    const expected = 'hello   world';
    expect(generateDiffHtml(current, [neighbor])).toBe(expected);
  });

  describe('BREAK handling', () => {
    it('should format BREAK with <br>', () => {
      const current = 'foo BREAK bar';
      const neighbor = 'foo BREAK bar';
      // BREAK should be followed by <br>
      // Note: The logic replaces "BREAK" with "BREAK<br>"
      const expected = 'foo BREAK<br> bar';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });

    it('should NOT highlight BREAK keyword itself even if missing in neighbor', () => {
      const current = 'foo BREAK bar';
      const neighbor = 'foo bar';
      // BREAK is missing in neighbor.
      // But we don't want to highlight BREAK keyword.
      // Logic: splitRegex captures BREAK. It is treated as delimiter.
      // Delimiters are NOT checked for diffs.
      // So BREAK should just be displayed (formatted), not highlighted.
      const expected = 'foo BREAK<br> bar';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });

    it('should handle BREAK without spaces', () => {
      const current = 'foo\nBREAK\nbar';
      const neighbor = 'foo bar';
      // \nBREAK\n matches \s*\bBREAK\b\s*
      // It should be treated as delimiter.
      const expected = 'foo\nBREAK<br>\nbar';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });

    it('should handle BREAK with comma correctly (newline after comma)', () => {
      const current = 'foo, BREAK, bar';
      const neighbor = 'foo, BREAK, bar';
      
      // "foo" -> "," -> " BREAK" -> "," -> " bar"
      // " BREAK" contains BREAK. Next part is ",".
      // Logic: if next part is comma, don't add <br> to BREAK.
      // Comma logic: if prev part was BREAK, add <br> after comma.
      
      // Expected: foo, BREAK, <br> bar
      // Let's trace:
      // 1. "foo"
      // 2. ","
      // 3. " BREAK" -> Next is "," -> Display " BREAK" (no <br>)
      // 4. "," -> Prev was " BREAK" -> Display ",<br>"
      // 5. " bar"
      
      const expected = 'foo, BREAK,<br> bar';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });
  });

  describe('Regression Cases', () => {
    it('should handle "masterpiece" correctly (not confuse with comma)', () => {
      const current = 'masterpiece, best quality';
      const neighbor = 'best quality';
      // "masterpiece" should be highlighted.
      // It should NOT be treated as delimiter.
      const expected = '<span class="diff-highlight">masterpiece</span>, best quality';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });

    it('should handle "armored dress" correctly (not confuse with BREAK)', () => {
      const current = 'BREAK armored dress BREAK';
      const neighbor = 'BREAK sailor BREAK';
      
      // "armored dress" is missing in neighbor -> Highlight
      // BREAKs are delimiters -> No highlight, just format
      
      // "armored" and "dress" are separate tokens now. Both missing -> Both highlighted.
      const expected = 'BREAK<br> <span class="diff-highlight">armored</span> <span class="diff-highlight">dress</span> BREAK<br>';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });
  });
});
