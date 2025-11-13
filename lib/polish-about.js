const INDONESIAN_REPLACEMENTS = [
  [/\b(gw|gue|gua)\b/gi, 'Saya'],
  [/\baku\b/gi, 'Saya'],
  [/\bngg?ak\b/gi, 'tidak'],
  [/\bga\b/gi, 'tidak'],
  [/\bgak\b/gi, 'tidak'],
  [/\benggak\b/gi, 'tidak'],
  [/\buda?h\b/gi, 'sudah'],
  [/\btlg\b/gi, 'tolong'],
  [/\bpls\b/gi, 'tolong'],
  [/\bbanget\b/gi, 'sangat'],
  [/\bseneng\b/gi, 'senang'],
  [/\bngerjain\b/gi, 'menangani'],
  [/\bkerjain\b/gi, 'menangani'],
  [/\bngulik\b/gi, 'mendalami'],
  [/\bbareng\b/gi, 'bersama'],
  [/\baja\b/gi, 'saja'],
  [/\bngapain\b/gi, 'melakukan apa'],
  [/\bngeliat\b/gi, 'mengalami perkembangan'],
  [/\bbikin\b/gi, 'membuat'],
  [/\bbiar\b/gi, 'agar'],
  [/\bkerjaan\b/gi, 'pekerjaan'],
  [/\btidak cuma\b/gi, 'tidak hanya'],
  [/\brapih\b/gi, 'rapi'],
  [/\bmakin\b/gi, 'semakin'],
  [/\bsmooth\b/gi, 'lancar'],
  [/\bkomunikasi enak\b/gi, (match) => (match[0] === 'K' ? 'Komunikasi yang hangat' : 'komunikasi yang hangat')],
  [/\bsenang sangat\b/gi, (match) => (match[0] === 'S' ? 'Sangat senang' : 'sangat senang')],
];

const ENGLISH_REPLACEMENTS = [
  [/\bgonna\b/gi, 'going to'],
  [/\bwanna\b/gi, 'want to'],
  [/\bgotta\b/gi, 'have to'],
  [/\bkinda\b/gi, 'rather'],
  [/\bsorta\b/gi, 'somewhat'],
  [/\bain't\b/gi, 'is not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bi'm\b/g, "I'm"],
  [/\bi've\b/g, "I've"],
  [/\bi'll\b/g, "I'll"],
  [/\bi'd\b/g, "I'd"],
];

const STYLE_REFINEMENTS = [
  [/\bfauzan\b/g, 'Fauzan'],
  [/\bbinus\b/gi, 'Binus'],
  [/\bbina nusantara\b/gi, 'Bina Nusantara'],
];

const APOSTROPHE_NORMALIZER = /[’`]/g;

function applyReplacements(value, replacements) {
  let result = value;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function fixPunctuationSpacing(value) {
  let result = value;
  result = result.replace(/\s+([,;:])/g, '$1');
  result = result.replace(/([,;:])(?!\s|$)/g, '$1 ');
  result = result.replace(/([.!?])(?!\s|$)/g, '$1 ');
  result = result.replace(/\s{2,}/g, ' ');
  return result.trim();
}

function capitalizeSentences(value) {
  return value.replace(/(^|[.!?]\s+)([^A-Za-zÀ-ÖØ-öø-ÿ0-9]*)([a-zà-ÿ])/g, (match, prefix, leading, char) => {
    return `${prefix ?? ''}${leading ?? ''}${char.toUpperCase()}`;
  });
}

function polishTextSegment(value) {
  let result = value.trim();
  if (!result) {
    return '';
  }

  result = result.replace(APOSTROPHE_NORMALIZER, "'");
  result = applyReplacements(result, INDONESIAN_REPLACEMENTS);
  result = applyReplacements(result, ENGLISH_REPLACEMENTS);
  result = applyReplacements(result, STYLE_REFINEMENTS);
  result = result.replace(/\bi\b/g, 'I');
  result = result.replace(/\bsaya saya\b/gi, 'Saya');
  result = fixPunctuationSpacing(result);
  result = capitalizeSentences(result);
  return result;
}

function polishLine(line) {
  if (line.trim().length === 0) {
    return '';
  }

  if (/^```/.test(line.trim()) || /^~~~/.test(line.trim())) {
    return line.trim();
  }

  const leadingWhitespace = line.match(/^\s*/)?.[0] ?? '';
  const trimmed = line.trim();

  if (/^#{1,6}\s/.test(trimmed)) {
    return `${leadingWhitespace}${trimmed.replace(/\s{2,}/g, ' ')}`;
  }

  if (/^>/.test(trimmed)) {
    const content = trimmed.slice(1).trimStart();
    const polished = polishTextSegment(content);
    return `${leadingWhitespace}> ${polished}`.trimEnd();
  }

  const bulletMatch = trimmed.match(/^([-*•])\s*(.*)$/);
  if (bulletMatch) {
    const [, bullet, content] = bulletMatch;
    const polished = polishTextSegment(content);
    return `${leadingWhitespace}${bullet} ${polished}`.trimEnd();
  }

  const polished = polishTextSegment(trimmed);
  return `${leadingWhitespace}${polished}`.trimEnd();
}

export function polishAboutContent(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const polishedLines = lines.map((line) => polishLine(line));
  let result = polishedLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trimEnd();
  if (!result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}

export function polishAboutFileContent(content) {
  return polishAboutContent(content);
}

export function polishSingleLine(line) {
  return polishLine(line);
}

export default polishAboutContent;
