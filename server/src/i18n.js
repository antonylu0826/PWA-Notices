const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'locales');
const resources = {};

// Auto-load all json files in locales directory
const files = fs.readdirSync(localesPath);
files.forEach(file => {
  if (file.endsWith('.json')) {
    const lng = file.replace('.json', '');
    const content = fs.readFileSync(path.join(localesPath, file), 'utf8');
    resources[lng] = {
      translation: JSON.parse(content)
    };
  }
});

i18next
  .use(middleware.LanguageDetector)
  .init({
    resources,
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
    }
  });

module.exports = {
  i18next,
  middleware: middleware.handle(i18next)
};
