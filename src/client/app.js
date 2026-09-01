const documentElement = document.documentElement;
documentElement.classList.add('nav-enhanced');

const body = document.body;
const nav = document.getElementById('primary-nav');
const menu = document.getElementById('menu-button');
const header = document.querySelector('.site-header');
const navDisclosures = nav ? [...nav.querySelectorAll('[data-nav-disclosure]')] : [];
const navigationViewport = window.matchMedia('(max-width: 1080px)');
const accessPanel = document.getElementById('access-panel');
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('site-search');
const searchResults = document.getElementById('search-results');

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
}

function isMobileNavigation() {
  return navigationViewport.matches;
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

menu?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});

for (const disclosure of navDisclosures) {
  disclosure.addEventListener('toggle', () => {
    if (disclosure.open) closeNavigationDisclosures({ except: disclosure });
  });
}

navigationViewport.addEventListener('change', (event) => {
  const focusWasInNavigation = Boolean(nav?.contains(document.activeElement));
  const focusWasOnMenu = document.activeElement === menu;
  setMenu(false);
  closeNavigationDisclosures();
  requestAnimationFrame(() => {
    if (event.matches && focusWasInNavigation) menu?.focus();
    else if (!event.matches && (focusWasInNavigation || focusWasOnMenu)) firstNavigationTarget()?.focus();
  });
});

window.addEventListener('resize', () => {
  if (isMobileNavigation() && nav?.classList.contains('open')) updateNavigationTop();
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
