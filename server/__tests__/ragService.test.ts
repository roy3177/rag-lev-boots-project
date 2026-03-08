import { describe, it, expect } from 'vitest';

// Pure utility functions extracted for testing
function chunkByWords(text: string, wordsPerChunk = 400): string[] {
  const words = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
}

function toPgVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

// ----------------------
// chunkByWords
// ----------------------
describe('chunkByWords', () => {
  it('returns empty array for empty string', () => {
    expect(chunkByWords('')).toEqual([]);
  });

  it('returns a single chunk when text is shorter than chunk size', () => {
    const text = 'hello world foo bar';
    const result = chunkByWords(text, 10);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('hello world foo bar');
  });

  it('splits text into correct number of chunks', () => {
    const words = Array.from({ length: 10 }, (_, i) => `word${i}`).join(' ');
    const result = chunkByWords(words, 3);
    expect(result).toHaveLength(4); // 3+3+3+1
  });

  it('normalizes multiple spaces and newlines', () => {
    const text = 'hello   world\n\nfoo';
    const result = chunkByWords(text, 10);
    expect(result[0]).toBe('hello world foo');
  });

  it('each chunk has at most wordsPerChunk words', () => {
    const words = Array.from({ length: 100 }, (_, i) => `w${i}`).join(' ');
    const result = chunkByWords(words, 20);
    for (const chunk of result) {
      expect(chunk.split(' ').length).toBeLessThanOrEqual(20);
    }
  });
});

// ----------------------
// toPgVectorLiteral
// ----------------------
describe('toPgVectorLiteral', () => {
  it('formats vector as pgvector literal', () => {
    expect(toPgVectorLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });

  it('handles empty array', () => {
    expect(toPgVectorLiteral([])).toBe('[]');
  });

  it('handles single value', () => {
    expect(toPgVectorLiteral([1])).toBe('[1]');
  });
});
