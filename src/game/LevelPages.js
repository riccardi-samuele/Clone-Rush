export const LEVELS_PER_PAGE = 24;

export function pageForLevel(number) {
  return Math.max(0, Math.floor((number - 1) / LEVELS_PER_PAGE));
}

export function levelPageRange(page, levelCount) {
  const lastPage = pageForLevel(levelCount);
  const start = Math.max(0, Math.min(lastPage, page)) * LEVELS_PER_PAGE + 1;
  return { start, end: Math.min(levelCount, start + LEVELS_PER_PAGE - 1) };
}
