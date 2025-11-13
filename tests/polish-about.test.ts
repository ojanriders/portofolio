import { describe, expect, it } from 'vitest';
import { polishAboutContent, polishSingleLine } from '../lib/polish-about.js';

describe('polishAboutContent', () => {
  it('normalizes informal Indonesian expressions and punctuation', () => {
    const input = 'gue udah kerja di IT support 5+ tahun.seneng banget bantu tim,ga cuma beresin error tapi juga belajar bareng.';
    const output = polishAboutContent(input);
    expect(output).toContain('Saya sudah kerja di IT support 5+ tahun.');
    expect(output).toContain('Sangat senang');
    expect(output).toContain('tidak hanya beresin error tapi juga belajar bersama.');
  });

  it('refines casual English tone', () => {
    const input = "hi! i'm fauzan,gonna keep learning.\ni wanna help teams grow.";
    const output = polishAboutContent(input);
    expect(output).toContain("Hi! I'm Fauzan, going to keep learning.");
    expect(output).toContain('I want to help teams grow.');
  });

  it('is idempotent on already polished content', () => {
    const input = '# Heading\n\nSaya sudah bekerja di IT Support.';
    const firstPass = polishAboutContent(input);
    const secondPass = polishAboutContent(firstPass);
    expect(secondPass).toBe(firstPass);
  });
});

describe('polishSingleLine', () => {
  it('polishes bullet lines while keeping markers', () => {
    const line = '- gue suka belajar hal baru';
    expect(polishSingleLine(line)).toBe('- Saya suka belajar hal baru');
  });
});
