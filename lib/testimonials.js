const DATA_URL = 'data/testimonials.json';
const grid = document.getElementById('testimonialsGrid');
const root = document.documentElement;

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const rotate = (items, offset) => {
  if (!items.length) return [];
  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
};

const randomize = (items) => {
  if (items.length <= 1) return [...items];
  const shuffled = shuffle(items);
  const offset = Math.floor(Math.random() * shuffled.length);
  return rotate(shuffled, offset);
};

const filterByLanguage = (items, lang) =>
  items.filter((item) => item?.quotes && typeof item.quotes[lang] === 'string' && item.quotes[lang].trim().length > 0);

const buildBlockquote = (text, lang) => {
  const blockquote = document.createElement('blockquote');
  blockquote.className = `text-slate-200/90 text-sm t t-${lang}`;
  blockquote.textContent = `“${text}”`;
  return blockquote;
};

const buildFigure = (item, index) => {
  const figure = document.createElement('figure');
  figure.className = 'rounded-2xl glass border border-slate-700 p-6 shadow-soft reveal';
  const delayClasses = ['', 'delay-1', 'delay-2', 'delay-3'];
  const delayClass = delayClasses[index] || '';
  if (delayClass) figure.classList.add(delayClass);

  const availableLangs = Object.keys(item.quotes || {});
  availableLangs.forEach((lang) => {
    const quoteText = item.quotes[lang];
    if (quoteText) {
      figure.appendChild(buildBlockquote(quoteText, lang));
    }
  });

  const figcaption = document.createElement('figcaption');
  figcaption.className = 'mt-4 text-xs text-slate-400';
  figcaption.textContent = item.author || '';
  figure.appendChild(figcaption);

  return figure;
};

const renderStatus = (messageId) => {
  const messages = {
    loading: {
      id: 'Memuat testimonial…',
      en: 'Loading testimonials…'
    },
    empty: {
      id: 'Testimonial belum tersedia.',
      en: 'Testimonials are not available yet.'
    },
    error: {
      id: 'Tidak dapat memuat testimonial.',
      en: 'Unable to load testimonials.'
    }
  };

  const lang = root.getAttribute('data-lang') === 'en' ? 'en' : 'id';
  const message = messages[messageId]?.[lang] || '';
  const status = document.createElement('p');
  status.className = 'text-sm text-slate-400 col-span-full';
  status.textContent = message;
  return status;
};

let testimonialsCache = [];

const render = (lang) => {
  if (!grid) return;

  grid.innerHTML = '';
  if (!testimonialsCache.length) {
    grid.appendChild(renderStatus('empty'));
    return;
  }

  const filtered = filterByLanguage(testimonialsCache, lang);
  if (!filtered.length) {
    grid.appendChild(renderStatus('empty'));
    return;
  }

  const randomized = randomize(filtered);
  randomized.forEach((item, index) => {
    grid.appendChild(buildFigure(item, index));
  });
};

const loadTestimonials = async () => {
  if (!grid) return;

  grid.innerHTML = '';
  grid.appendChild(renderStatus('loading'));

  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    const dataset = Array.isArray(raw) ? raw : Array.isArray(raw?.testimonials) ? raw.testimonials : [];
    testimonialsCache = dataset.map((item) => ({
      ...item,
      quotes: { ...(item.quotes || {}) }
    }));
  } catch (error) {
    console.error('Failed to load testimonials', error);
    grid.innerHTML = '';
    grid.appendChild(renderStatus('error'));
    return;
  }

  const currentLang = root.getAttribute('data-lang') === 'en' ? 'en' : 'id';
  render(currentLang);
};

if (grid) {
  loadTestimonials();

  document.addEventListener('languagechange', (event) => {
    const lang = event?.detail === 'en' ? 'en' : 'id';
    render(lang);
  });
}
