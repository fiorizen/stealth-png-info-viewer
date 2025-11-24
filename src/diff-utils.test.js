import { describe, expect, it } from 'vitest';
import { generateDiffHtml } from './diff-utils.js';

describe('generateDiffHtml', () => {
  it('should return original text if only one text', () => {
    const text = 'hello world';
    expect(generateDiffHtml(text, [text])).toBe('hello world');
  });

  it('should highlight added words', () => {
    const current = 'hello, world';
    const other = 'hello';
    // "world" is missing in other, so it should be highlighted
    // allTexts includes current
    const expected = 'hello, <span class="diff-highlight">world</span>';
    expect(generateDiffHtml(current, [current, other])).toBe(expected);
  });

  it('should highlight changed words', () => {
    const current = 'hello, world';
    const other = 'hello, there';
    // "world" is missing in other
    // allTexts includes current
    const expected = 'hello, <span class="diff-highlight">world</span>';
    expect(generateDiffHtml(current, [current, other])).toBe(expected);
  });

  it('should support global diff (highlight if not in ALL texts)', () => {
    const text1 = 'A, B, C';
    const text2 = 'A, C'; // Missing B
    const text3 = 'A, B'; // Missing C
    
    // For text1: B is missing in text2, C is missing in text3 -> Both highlighted
    // A is common to all -> Not highlighted
    const expected1 = 'A, <span class="diff-highlight">B</span>, <span class="diff-highlight">C</span>';
    expect(generateDiffHtml(text1, [text1, text2, text3])).toBe(expected1);
    
    // For text2: B is missing (not in text2), C is common to text1 and text2 but not text3 -> C highlighted
    const expected2 = 'A, <span class="diff-highlight">C</span>';
    expect(generateDiffHtml(text2, [text1, text2, text3])).toBe(expected2);
    
    // For text3: C is missing (not in text3), B is common to text1 and text3 but not text2 -> B highlighted
    const expected3 = 'A, <span class="diff-highlight">B</span>';
    expect(generateDiffHtml(text3, [text1, text2, text3])).toBe(expected3);
  });

  it('should handle multi-word phrases correctly', () => {
    const current = 'averting eyes, looking at viewer';
    const other = 'upturned eyes, looking at viewer';
    
    // "averting eyes" is missing in other -> Highlight entire phrase
    // "looking at viewer" is common -> No highlight
    const expected = '<span class="diff-highlight">averting eyes</span>, looking at viewer';
    expect(generateDiffHtml(current, [current, other])).toBe(expected);
  });

  it('should highlight all different phrases in a set (global)', () => {
    const text1 = 'averting eyes, smiling';
    const text2 = 'upturned eyes, smiling';
    const text3 = 'looking back, smiling';
    
    // Common to all: "smiling"
    // For text1: "averting eyes" is unique -> Highlight
    const expected1 = '<span class="diff-highlight">averting eyes</span>, smiling';
    expect(generateDiffHtml(text1, [text1, text2, text3])).toBe(expected1);
    
    // For text2: "upturned eyes" is unique -> Highlight
    const expected2 = '<span class="diff-highlight">upturned eyes</span>, smiling';
    expect(generateDiffHtml(text2, [text1, text2, text3])).toBe(expected2);
    
    // For text3: "looking back" is unique -> Highlight
    const expected3 = '<span class="diff-highlight">looking back</span>, smiling';
    expect(generateDiffHtml(text3, [text1, text2, text3])).toBe(expected3);
  });

  it('should handle user-reported case correctly', () => {
    const text1 = 'looking up BREAK amazuyu tatsuki, tomose shunsaku BREAK masterpiece';
    const text2 = 'looking up BREAK mibu natsuki, amazuyu tatsuki BREAK masterpiece';
    const text3 = 'looking up BREAK misaki kurehito, mibu natsuki BREAK masterpiece';
    
    // Common to all: "looking up", "masterpiece"
    // For text2: "mibu natsuki" and "amazuyu tatsuki" are unique -> Both highlighted
    const expected2 = 'looking up BREAK<br><span class="diff-highlight">mibu natsuki</span>, <span class="diff-highlight">amazuyu tatsuki</span> BREAK<br>masterpiece';
    expect(generateDiffHtml(text2, [text1, text2, text3])).toBe(expected2);
  });

  describe('BREAK handling', () => {
    it('should format BREAK with <br>', () => {
      const current = 'foo BREAK bar';
      const expected = 'foo BREAK<br>bar';
      expect(generateDiffHtml(current, [current])).toBe(expected);
    });

    it('should NOT highlight BREAK keyword itself', () => {
      const current = 'foo BREAK bar';
      const other = 'foo, bar';
      // BREAK is a delimiter, not content
      // "foo" and "bar" are common -> No highlight
      const expected = 'foo BREAK<br>bar';
      expect(generateDiffHtml(current, [current, other])).toBe(expected);
    });

    it('should handle BREAK without spaces', () => {
      const current = 'foo\nBREAK\nbar';
      const other = 'foo, bar';
      const expected = 'foo\nBREAK<br>bar';
      expect(generateDiffHtml(current, [current, other])).toBe(expected);
    });

    it('should handle BREAK with comma correctly (newline after comma)', () => {
      const current = 'foo, BREAK, bar';
      const expected = 'foo, BREAK,<br>bar';
      expect(generateDiffHtml(current, [current])).toBe(expected);
    });
  });

  describe('Regression Cases', () => {
    it('should handle "masterpiece" correctly (not confuse with comma)', () => {
      const current = 'masterpiece, best quality';
      const other = 'best quality';
      // "masterpiece" should be highlighted.
      const expected = '<span class="diff-highlight">masterpiece</span>, best quality';
      expect(generateDiffHtml(current, [current, other])).toBe(expected);
    });

    it('should handle "armored dress" correctly (not confuse with BREAK)', () => {
      const current = 'BREAK armored dress BREAK';
      const other = 'BREAK sailor BREAK';
      
      // "armored dress" is missing in other -> Highlight entire phrase
      // BREAKs are delimiters -> No highlight, just format
      const expected = 'BREAK<br><span class="diff-highlight">armored dress</span> BREAK<br>';
      expect(generateDiffHtml(current, [current, other])).toBe(expected);
    });
  });
});
