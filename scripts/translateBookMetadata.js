const TRANSLATION_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const MAX_REQUEST_CHARACTERS = 30000;
const translationCache = new Map();
const CATEGORY_TRANSLATIONS = new Map([
  ['fiction', 'Ficción'],
  ['young adult fiction', 'Ficción juvenil'],
  ['juvenile fiction', 'Ficción infantil'],
  ['juvenile nonfiction', 'No ficción infantil'],
  ['nonfiction', 'No ficción'],
  ['science fiction', 'Ciencia ficción'],
  ['fantasy', 'Fantasía'],
  ['history', 'Historia'],
  ['biography & autobiography', 'Biografía y autobiografía'],
  ['poetry', 'Poesía'],
  ['drama', 'Teatro'],
  ['literary criticism', 'Crítica literaria'],
  ['literary collections', 'Colecciones literarias'],
  ['social science', 'Ciencias sociales'],
  ['psychology', 'Psicología'],
  ['religion', 'Religión'],
  ['family & relationships', 'Familia y relaciones'],
  ['depressed persons', 'Personas con depresión'],
]);

function getTranslationApiKey() {
  return process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
}

function isSpanish(language) {
  return String(language || '').toLowerCase().split(/[-_]/)[0] === 'es';
}

async function requestTranslations(texts, apiKey) {
  const url = new URL(TRANSLATION_API_URL);
  const body = { q: texts, target: 'es', format: 'html' };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Cloud Translation HTTP ${response.status}`);

  const payload = await response.json();
  const translations = payload.data?.translations;
  if (!Array.isArray(translations) || translations.length !== texts.length) {
    throw new Error('Cloud Translation returned an incomplete response');
  }
  return translations;
}

async function translateBookMetadata({ description = '', categories = [], language = '' }) {
  const originalCategories = Array.isArray(categories) ? categories : [];
  const result = {
    description,
    categories: [...originalCategories],
    changed: false,
    descriptionComplete: !description || isSpanish(language),
    categoriesComplete: originalCategories.length === 0,
  };
  const apiKey = getTranslationApiKey();

  const fields = [];
  if (description && !isSpanish(language) && description.length <= MAX_REQUEST_CHARACTERS) {
    fields.push({ key: 'description', text: description });
  }
  originalCategories.forEach((category, index) => {
    if (typeof category !== 'string' || !category.trim()) return;
    const localTranslation = CATEGORY_TRANSLATIONS.get(category.trim().toLowerCase());
    if (localTranslation) {
      result.categories[index] = localTranslation;
      if (localTranslation !== category) result.changed = true;
      return;
    }
    fields.push({ key: `category:${index}`, text: category });
  });
  result.categoriesComplete = originalCategories.every((category) => (
    typeof category !== 'string'
    || !category.trim()
    || CATEGORY_TRANSLATIONS.has(category.trim().toLowerCase())
  ));

  if (!apiKey || !fields.length || fields.reduce((total, field) => total + field.text.length, 0) > MAX_REQUEST_CHARACTERS) {
    return result;
  }

  const cacheKeys = fields.map(({ text }) => `auto\u0000${text}`);
  const missing = fields.filter((_, index) => !translationCache.has(cacheKeys[index]));
  if (missing.length) {
    try {
      const translations = await requestTranslations(missing.map((field) => field.text), apiKey);
      missing.forEach((field, index) => {
        const translated = translations[index];
        translationCache.set(`auto\u0000${field.text}`, {
          text: isSpanish(translated.detectedSourceLanguage) || !translated.translatedText
            ? field.text
            : translated.translatedText,
          complete: isSpanish(translated.detectedSourceLanguage) || Boolean(translated.translatedText),
        });
      });
    } catch (error) {
      // Keep the original metadata if translation is unavailable or fails.
      missing.forEach((field) => {
        translationCache.set(`auto\u0000${field.text}`, { text: field.text, complete: false });
      });
      console.warn(`[translation] Cloud Translation unavailable; keeping original metadata (${error.message})`);
    }
  }

  fields.forEach((field, index) => {
    const translation = translationCache.get(cacheKeys[index]);
    if (!translation) return;
    const { text: translated, complete } = translation;
    if (field.key === 'description') {
      result.descriptionComplete = complete;
      if (translated !== field.text) {
        result.description = translated;
        result.changed = true;
      }
    } else {
      const categoryIndex = Number(field.key.slice('category:'.length));
      result.categories[categoryIndex] = translated;
      result.categoriesComplete = complete;
      if (translated !== field.text) result.changed = true;
    }
  });
  result.categoriesComplete = originalCategories.every((category, categoryIndex) => {
    if (typeof category !== 'string' || !category.trim()
      || CATEGORY_TRANSLATIONS.has(category.trim().toLowerCase())) return true;
    const fieldIndex = fields.findIndex((field) => field.key === `category:${categoryIndex}`);
    return fieldIndex >= 0 && Boolean(translationCache.get(cacheKeys[fieldIndex])?.complete);
  });
  return result;
}

module.exports = { isSpanish, translateBookMetadata };
