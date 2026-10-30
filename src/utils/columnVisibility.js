export const COLUMNS_STORAGE_KEY = 'bahia-lectora:libros:columns';

/**
 * Keeps only known fields with boolean values from a stored model.
 * @param {unknown} model - Parsed stored value.
 * @param {string[]} fields - Valid column fields.
 * @returns {Record<string, boolean>}
 */
export const sanitizeVisibility = (model, fields) => {
  const clean = {};
  if (!model || typeof model !== 'object' || Array.isArray(model)) return clean;
  fields.forEach((field) => {
    if (typeof model[field] === 'boolean') clean[field] = model[field];
  });
  return clean;
};

/**
 * Reads the saved column visibility model from localStorage.
 * @param {string[]} fields - Valid column fields.
 * @returns {Record<string, boolean>} Empty object (all visible) if nothing valid is stored.
 */
export const loadColumnVisibility = (fields) => {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    return raw ? sanitizeVisibility(JSON.parse(raw), fields) : {};
  } catch {
    return {};
  }
};

/**
 * Saves the column visibility model to localStorage (ignored if unavailable).
 * @param {Record<string, boolean>} model - Visibility model.
 */
export const saveColumnVisibility = (model) => {
  try {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(model));
  } catch {
    // Storage blocked or full: keep working without persistence.
  }
};
