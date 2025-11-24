import { describe, expect, it } from 'vitest';
import { generateDiffHtml } from './diff-utils.js';

describe('generateDiffHtml', () => {
  it('should return original text if no neighbors', () => {
    const text = 'hello world';
    expect(generateDiffHtml(text, [])).toBe('hello world');
  });

  it('should highlight added words', () => {
    const current = 'hello, world';
    const neighbor = 'hello';
    // "world" is missing in neighbor, so it should be highlighted
    const expected = 'hello, <span class="diff-highlight">world</span>';
    expect(generateDiffHtml(current, [neighbor])).toBe(expected);
  });

  it('should highlight changed words', () => {
    const current = 'hello, world';
    const neighbor = 'hello, there';
    // "world" is missing in neighbor
    const expected = 'hello, <span class="diff-highlight">world</span>';
    expect(generateDiffHtml(current, [neighbor])).toBe(expected);
  });

  it('should support bidirectional diff (highlight if missing in EITHER neighbor)', () => {
    const current = 'A, B, C';
    const prev = 'A, C'; // Missing B
    const next = 'A, B'; // Missing C
    
    // B is missing in prev -> Highlight B
    // C is missing in next -> Highlight C
    const expected = 'A, <span class="diff-highlight">B</span>, <span class="diff-highlight">C</span>';
    expect(generateDiffHtml(current, [prev, next])).toBe(expected);
  });

  it('should handle multi-word phrases correctly', () => {
    const current = 'averting eyes, looking at viewer';
    const neighbor = 'upturned eyes, looking at viewer';
    
    // "averting eyes" is missing in neighbor -> Highlight entire phrase
    // "upturned eyes" is in neighbor but not current -> No highlight in current
    // "looking at viewer" is common -> No highlight
    const expected = '<span class="diff-highlight">averting eyes</span>, looking at viewer';
    expect(generateDiffHtml(current, [neighbor])).toBe(expected);
  });

  it('should highlight all different phrases in a set', () => {
    const current1 = 'averting eyes, smiling';
    const current2 = 'upturned eyes, smiling';
    const current3 = 'looking back, smiling';
    
    // For current1: "averting eyes" is missing in both neighbors -> Highlight
    const expected1 = '<span class="diff-highlight">averting eyes</span>, smiling';
    expect(generateDiffHtml(current1, [current2, current3])).toBe(expected1);
    
    // For current2: "upturned eyes" is missing in both neighbors -> Highlight
    const expected2 = '<span class="diff-highlight">upturned eyes</span>, smiling';
    expect(generateDiffHtml(current2, [current1, current3])).toBe(expected2);
    
    // For current3: "looking back" is missing in both neighbors -> Highlight
    const expected3 = '<span class="diff-highlight">looking back</span>, smiling';
    expect(generateDiffHtml(current3, [current1, current2])).toBe(expected3);
  });

  describe('BREAK handling', () => {
    it('should format BREAK with <br>', () => {
      const current = 'foo BREAK bar';
      const neighbor = 'foo BREAK bar';
      // BREAK should be followed by <br>
      const expected = 'foo BREAK<br>bar';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });

    it('should NOT highlight BREAK keyword itself even if missing in neighbor', () => {
      const current = 'foo BREAK bar';
      const neighbor = 'foo, bar';
      // BREAK is missing in neighbor but is a delimiter, not content
      // "foo" and "bar" are common -> No highlight
      const expected = 'foo BREAK<br>bar';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });

    it('should handle BREAK without spaces', () => {
      const current = 'foo\nBREAK\nbar';
      const neighbor = 'foo, bar';
      // \nBREAK\n matches \s*\bBREAK\b\s*
      const expected = 'foo\nBREAK<br>bar';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });

    it('should handle BREAK with comma correctly (newline after comma)', () => {
      const current = 'foo, BREAK, bar';
      const neighbor = 'foo, BREAK, bar';
      
      // Expected: foo, BREAK,<br>bar
      const expected = 'foo, BREAK,<br>bar';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });
  });

  describe('Regression Cases', () => {
    it('should handle "masterpiece" correctly (not confuse with comma)', () => {
      const current = 'masterpiece, best quality';
      const neighbor = 'best quality';
      // "masterpiece" should be highlighted.
      const expected = '<span class="diff-highlight">masterpiece</span>, best quality';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });

    it('should handle "armored dress" correctly (not confuse with BREAK)', () => {
      const current = 'BREAK armored dress BREAK';
      const neighbor = 'BREAK sailor BREAK';
      
      // "armored dress" is missing in neighbor -> Highlight entire phrase
      // BREAKs are delimiters -> No highlight, just format
      // Note: There's a space after first BREAK that's part of the phrase
      const expected = 'BREAK<br><span class="diff-highlight">armored dress</span> BREAK<br>';
      expect(generateDiffHtml(current, [neighbor])).toBe(expected);
    });
  });
});
