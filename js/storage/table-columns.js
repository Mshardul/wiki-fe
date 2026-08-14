const PREFIX = "wiki-table-cols-";

function _key(wikiId, articlePath, tableId) {
  return `${PREFIX}${wikiId}-${articlePath.replace(/\//g, "-")}-${tableId}`;
}

function getHiddenTableColumns(wikiId, articlePath, tableId) {
  try {
    const raw = localStorage.getItem(_key(wikiId, articlePath, tableId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}

function setHiddenTableColumns(wikiId, articlePath, tableId, hiddenNames) {
  const key = _key(wikiId, articlePath, tableId);
  if (!hiddenNames.length) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(hiddenNames));
}

export { getHiddenTableColumns, setHiddenTableColumns };
