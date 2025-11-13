function splitIntoSentences(message: string): string[] {
  return message
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function summarizeMessage(message: string, maxSentences = 2, maxLength = 280): string {
  const cleaned = message.trim();
  if (!cleaned) {
    return '';
  }

  const sentences = splitIntoSentences(cleaned);
  const selected: string[] = [];

  for (const sentence of sentences) {
    if (selected.length >= maxSentences) {
      break;
    }
    selected.push(sentence);
  }

  const summary = selected.join(' ');
  if (summary.length <= maxLength) {
    return summary;
  }

  return `${summary.slice(0, maxLength - 1)}…`;
}

export function createDigest(
  name: string,
  email: string,
  company: string | undefined,
  message: string,
  summary?: string,
): string {
  const resolvedSummary = summary ?? summarizeMessage(message);
  const lines = [
    `Prospect: ${name}`,
    `Email: ${email}`,
  ];

  if (company) {
    lines.push(`Company: ${company}`);
  }

  lines.push('', 'Summary:', resolvedSummary || '(Could not generate summary)', '', 'Full message:', message.trim());

  return lines.join('\n');
}
