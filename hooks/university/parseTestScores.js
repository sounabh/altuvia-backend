/**
 * parseTestScores.js
 * Pure utility — no side effects, fully unit-testable.
 * Handles string (JSON or CSV) and object inputs.
 */

const EMPTY = {
  hasGMAT: false,
  hasGRE: false,
  hasIELTS: false,
  hasTOEFL: false,
  gmatScore: null,
  greScore: null,
  ieltsScore: null,
  toeflScore: null,
};

const fromObject = (scores) => ({
  hasGMAT: !!scores.gmat && scores.gmat > 0,
  hasGRE: !!scores.gre && scores.gre > 0,
  hasIELTS: !!scores.ielts && scores.ielts > 0,
  hasTOEFL: !!scores.toefl && scores.toefl > 0,
  gmatScore: scores.gmat || null,
  greScore: scores.gre || null,
  ieltsScore: scores.ielts || null,
  toeflScore: scores.toefl || null,
});

const parseCsv = (str) => {
  const scores = {};
  for (const part of str.split(',')) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).trim().toLowerCase();
    const num = parseFloat(part.slice(colonIdx + 1).trim());
    if (key && !isNaN(num)) scores[key] = num;
  }
  return scores;
};

export function parseTestScores(input) {
  if (!input) return EMPTY;
  try {
    if (typeof input === 'object') return fromObject(input);

    const str = input.trim();
    const scores =
      str.startsWith('{') || str.startsWith('[')
        ? JSON.parse(str)
        : parseCsv(str);

    return fromObject(scores);
  } catch {
    return EMPTY;
  }
}