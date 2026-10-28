const TRANSLATION_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const MAX_REQUEST_CHARACTERS = 30000;
const translationCache = new Map();

function getTranslationApiKey() {
  return process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
}

function isSpanish(language) {
  return String(language || '').toLowerCase().split(/[-_]/)[0] === 'es';
}

async function requestTranslations(texts, sourceLanguage, apiKey) {
  const url = new URL(TRANSLATION_API_URL);
  const body = { q: texts, target: 'es', format: 'html' };
  if (/^[a-z]{2}$/i.test(sourceLanguage || '')) body.source = sourceLanguage;

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
  const result = { description, categories: [...originalCategories], changed: false };
  const apiKey = getTranslationApiKey();
  if (!apiKey || isSpanish(language)) return result;

  const fields = [];
  if (description && description.length <= MAX_REQUEST_CHARACTERS) {
    fields.push({ key: 'description', text: description });
  }
  originalCategories.forEach((category, index) => {
    if (typeof category === 'string' && category.trim()) {
      fields.push({ key: `category:${index}`, text: category });
    }
  });
  if (!fields.length || fields.reduce((total, field) => total + field.text.length, 0) > MAX_REQUEST_CHARACTERS) {
    return result;
  }

  const cacheKeys = fields.map(({ text }) => `${language || 'auto'}\u0000${text}`);
  const missing = fields.filter((_, index) => !translationCache.has(cacheKeys[index]));
  if (missing.length) {
    try {
      const translations = await requestTranslations(
        missing.map((field) => field.text), language, apiKey,
      );
      missing.forEach((field, index) => {
        const translated = translations[index];
        translationCache.set(
          `${language || 'auto'}\u0000${field.text}`,
          isSpanish(translated.detectedSourceLanguage) || !translated.translatedText
            ? field.text
            : translated.translatedText,
        );
      });
    } catch (error) {
      // Keep the original metadata if translation is unavailable or fails.
      missing.forEach((field) => {
        translationCache.set(`${language || 'auto'}\u0000${field.text}`, field.text);
      });
      console.warn(`[translation] Cloud Translation unavailable; keeping original metadata (${error.message})`);
    }
  }

  fields.forEach((field, index) => {
    const translated = translationCache.get(cacheKeys[index]);
    if (!translated || translated === field.text) return;
    result.changed = true;
    if (field.key === 'description') result.description = translated;
    else result.categories[Number(field.key.slice('category:'.length))] = translated;
  });
  return result;
}

module.exports = { isSpanish, translateBookMetadata };
