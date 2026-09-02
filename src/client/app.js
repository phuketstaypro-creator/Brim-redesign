const documentElement = document.documentElement;
documentElement.classList.add('nav-enhanced');

const body = document.body;
const nav = document.getElementById('primary-nav');
const menu = document.getElementById('menu-button');
const header = document.querySelector('.site-header');
const navDisclosures = nav ? [...nav.querySelectorAll('[data-nav-disclosure]')] : [];
const accessPanel = document.getElementById('access-panel');
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('site-search');
const searchResults = document.getElementById('search-results');
const editorialGrids = [...document.querySelectorAll('.editorial-news')];

const defaults = {
  size: 'normal',
  theme: 'normal',
  images: 'on',
  spacing: 'normal',
  motion: 'on'
};

let savedSettings = {};
try {
  savedSettings = JSON.parse(localStorage.getItem('brhk-access') || '{}');
} catch {
  savedSettings = {};
}

const settings = { ...defaults, ...savedSettings };
let activeDialog = null;
let dialogTrigger = null;
let searchIndex = null;
let editorialLayoutFrame = 0;
let editorialResizeObserver = null;
let compactNavigation = false;

function layoutEditorialGrid(grid) {
  const cards = [...grid.querySelectorAll(':scope > .editorial-card')];
  if (!cards.length || grid.clientWidth <= 0) return;

  grid.classList.add('is-masonry');
  const styles = getComputedStyle(grid);
  const requestedColumns = Number.parseInt(styles.getPropertyValue('--editorial-columns'), 10) || 2;
  const columns = Math.max(1, Math.min(requestedColumns, cards.length));
  const gap = Number.parseFloat(styles.columnGap) || 0;
  const cardWidth = (grid.clientWidth - gap * (columns - 1)) / columns;
  const laneHeights = Array(columns).fill(0);

  for (const card of cards) card.style.width = `${cardWidth}px`;

  for (const card of cards) {
    const shortest = Math.min(...laneHeights);
    const lane = laneHeights.indexOf(shortest);
    card.style.left = `${lane * (cardWidth + gap)}px`;
    card.style.top = `${shortest}px`;
    laneHeights[lane] = shortest + card.getBoundingClientRect().height + gap;
  }

  grid.style.height = `${Math.max(...laneHeights) - gap}px`;
  grid.dataset.masonry = 'ready';
}

function scheduleEditorialLayouts() {
  if (!editorialGrids.length) return;
  for (const grid of editorialGrids) grid.dataset.masonry = 'pending';
  cancelAnimationFrame(editorialLayoutFrame);
  editorialLayoutFrame = requestAnimationFrame(() => {
    editorialLayoutFrame = 0;
    for (const grid of editorialGrids) layoutEditorialGrid(grid);
  });
}

function initializeEditorialMasonry() {
  if (!editorialGrids.length) return;

  for (const grid of editorialGrids) {
    for (const image of grid.querySelectorAll('img')) {
      if (!image.complete) image.addEventListener('load', scheduleEditorialLayouts, { once: true });
    }
  }

  if ('ResizeObserver' in window) {
    editorialResizeObserver = new ResizeObserver(scheduleEditorialLayouts);
    for (const grid of editorialGrids) {
      for (const card of grid.querySelectorAll(':scope > .editorial-card')) editorialResizeObserver.observe(card);
    }
  }

  document.fonts?.ready.then(scheduleEditorialLayouts);
  scheduleEditorialLayouts();
}

function applySettings() {
  for (const [key, value] of Object.entries(settings)) {
    documentElement.dataset[key] = value;
  }

  document.querySelectorAll('[data-setting]').forEach((button) => {
    const active = settings[button.dataset.setting] === button.dataset.value;
    button.setAttribute('aria-pressed', String(active));
  });

  try {
    localStorage.setItem('brhk-access', JSON.stringify(settings));
  } catch {
    // Local storage may be unavailable in privacy modes; the controls still work.
  }

  updateNavigationMode();
  scheduleEditorialLayouts();
}

function isMobileNavigation() {
  return compactNavigation;
}

function navigationBreakpoint() {
  if (settings.size === 'xlarge') return 1420;
  if (settings.size === 'large') return 1280;
  return 1080;
}

function updateNavigationMode() {
  const wasCompact = compactNavigation;
  compactNavigation = window.innerWidth <= navigationBreakpoint();
  documentElement.classList.toggle('nav-compact', compactNavigation);
  if (wasCompact === compactNavigation) return;

  const focusWasInNavigation = Boolean(nav?.contains(document.activeElement));
  const focusWasOnMenu = document.activeElement === menu;
  setMenu(false);
  closeNavigationDisclosures();
  requestAnimationFrame(() => {
    if (compactNavigation && focusWasInNavigation) menu?.focus();
    else if (!compactNavigation && (focusWasInNavigation || focusWasOnMenu)) firstNavigationTarget()?.focus();
  });
}

function updateNavigationTop() {
  if (!nav || !header) return;
  nav.style.setProperty('--nav-top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
}

function firstNavigationTarget() {
  return nav?.querySelector('[data-nav-summary], .primary-nav-list > .nav-item > a') || null;
}

function closeNavigationDisclosure(disclosure, { restoreFocus = false } = {}) {
  if (!disclosure?.open) return false;
  disclosure.open = false;
  if (restoreFocus) disclosure.querySelector('[data-nav-summary]')?.focus();
  return true;
}

function closeNavigationDisclosures({ except = null } = {}) {
  for (const disclosure of navDisclosures) {
    if (disclosure !== except) closeNavigationDisclosure(disclosure);
  }
}

function openNavigationDisclosure() {
  return navDisclosures.find((disclosure) => disclosure.open) || null;
}

function setMenu(open, { restoreFocus = false } = {}) {
  if (!nav || !menu || !header) return;
  if (open && !isMobileNavigation()) return;
  nav.classList.toggle('open', open);
  body.classList.toggle('menu-open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Закрыть' : 'Меню';
  if (open) {
    updateNavigationTop();
    requestAnimationFrame(() => {
      if (nav.classList.contains('open')) firstNavigationTarget()?.focus();
    });
  } else {
    nav.style.removeProperty('--nav-top');
    closeNavigationDisclosures();
    if (restoreFocus) menu.focus();
  }
}

function focusableElements(container) {
  return [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

function openDialog(dialog, trigger, focusTarget) {
  if (!dialog) return;
  if (activeDialog && activeDialog !== dialog) closeDialog(activeDialog, false);
  activeDialog = dialog;
  dialogTrigger = trigger || document.activeElement;
  dialog.classList.add('open');
  dialog.setAttribute('aria-hidden', 'false');
  body.classList.add('modal-open');
  (focusTarget || focusableElements(dialog)[0])?.focus();
}

function closeDialog(dialog = activeDialog, restoreFocus = true) {
  if (!dialog) return;
  dialog.classList.remove('open');
  dialog.setAttribute('aria-hidden', 'true');
  body.classList.remove('modal-open');
  activeDialog = null;
  if (restoreFocus) dialogTrigger?.focus?.();
  dialogTrigger = null;
}

function trapDialogFocus(event) {
  if (event.key !== 'Tab' || !activeDialog) return;
  const focusable = focusableElements(activeDialog);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

async function getSearchIndex() {
  if (searchIndex) return searchIndex;
  const response = await fetch('/search-index.json', { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Search index: ${response.status}`);
  searchIndex = await response.json();
  return searchIndex;
}

function renderSearchResults(results, query) {
  searchResults.replaceChildren();
  if (query.length < 2) {
    const message = document.createElement('p');
    message.textContent = 'Введите минимум два символа.';
    searchResults.append(message);
    return;
  }

  if (!results.length) {
    const message = document.createElement('p');
    message.textContent = 'Ничего не найдено.';
    searchResults.append(message);
    return;
  }

  for (const item of results) {
    const link = document.createElement('a');
    const title = document.createElement('b');
    const description = document.createElement('small');
    link.href = item.url;
    title.textContent = item.title;
    description.textContent = item.description;
    link.append(title, document.createElement('br'), description);
    searchResults.append(link);
  }
}

applySettings();
initializeEditorialMasonry();

menu?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});

for (const disclosure of navDisclosures) {
  disclosure.addEventListener('toggle', () => {
    if (disclosure.open) closeNavigationDisclosures({ except: disclosure });
  });
}

window.addEventListener('resize', () => {
  updateNavigationMode();
  if (isMobileNavigation() && nav?.classList.contains('open')) updateNavigationTop();
  scheduleEditorialLayouts();
});

document.addEventListener('click', (event) => {
  const settingButton = event.target.closest('[data-setting]');
  if (settingButton) {
    settings[settingButton.dataset.setting] = settingButton.dataset.value;
    applySettings();
  }

  if (event.target.closest('[data-access-reset]')) {
    Object.assign(settings, defaults);
    applySettings();
  }

  const accessOpen = event.target.closest('[data-access-open]');
  if (accessOpen) {
    setMenu(false);
    openDialog(accessPanel, accessOpen);
  }
  if (event.target.closest('[data-access-close]')) closeDialog(accessPanel);

  const searchOpen = event.target.closest('[data-search-open]');
  if (searchOpen) {
    setMenu(false);
    openDialog(searchModal, searchOpen, searchInput);
  }
  if (event.target.closest('[data-search-close]')) closeDialog(searchModal);

  if (activeDialog && event.target === activeDialog) closeDialog(activeDialog);
  if (!isMobileNavigation() && nav && !nav.contains(event.target)) closeNavigationDisclosures();
});

document.addEventListener('keydown', (event) => {
  trapDialogFocus(event);
  if (event.key !== 'Escape') return;
  if (activeDialog) {
    closeDialog(activeDialog);
    return;
  }

  const disclosure = openNavigationDisclosure();
  if (disclosure) {
    event.preventDefault();
    closeNavigationDisclosure(disclosure, { restoreFocus: true });
    return;
  }

  if (nav?.classList.contains('open')) {
    event.preventDefault();
    setMenu(false, { restoreFocus: true });
  }
});

searchInput?.addEventListener('input', async (event) => {
  const query = event.target.value.toLocaleLowerCase('ru').trim();
  if (query.length < 2) {
    renderSearchResults([], query);
    return;
  }

  try {
    const index = await getSearchIndex();
    const results = index
      .filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase('ru').includes(query))
      .slice(0, 12);
    renderSearchResults(results, query);
  } catch {
    searchResults.textContent = 'Поиск временно недоступен.';
  }
});
