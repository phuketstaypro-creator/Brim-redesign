const yandexSource = 'https://disk.yandex.ru/d/0grsoeDxm9nDbQ';
const archiveRightsStatus = 'client-provided-pending-final-rights-check';
const archiveCredit = 'Архив БРХК';
const derivativeNote = 'WebP derivative generated from a Yandex Disk preview of the client-provided JPEG original.';

function rendition(filename, width, height) {
  return {
    sourcePath: `assets/images/${filename}`,
    src: `/assets/images/${filename}`,
    width,
    height
  };
}

function archiveAsset({ id, filename, variantFilename, width, height, variantWidth, variantHeight, defaultAlt, originalName }) {
  const main = rendition(filename, width, height);
  const compact = rendition(variantFilename, variantWidth, variantHeight);
  return {
    id,
    ...main,
    defaultAlt,
    source: yandexSource,
    originalName,
    rightsStatus: archiveRightsStatus,
    credit: archiveCredit,
    derivativeNote,
    variants: [compact, main]
  };
}

const initiation001Portrait = archiveAsset({
  id: 'initiation001Portrait',
  filename: 'initiation-001-portrait.webp',
  variantFilename: 'initiation-001-portrait-320.webp',
  width: 480,
  height: 720,
  variantWidth: 320,
  variantHeight: 480,
  defaultAlt: 'Исполнитель представляет хореографический номер БРХК',
  originalName: '20251022 БРХК Посвящение в профессию — 001.jpg'
});

const initiation001Square = archiveAsset({
  id: 'initiation001Square',
  filename: 'initiation-001-square.webp',
  variantFilename: 'initiation-001-square-320.webp',
  width: 480,
  height: 480,
  variantWidth: 320,
  variantHeight: 320,
  defaultAlt: 'Исполнитель представляет хореографический номер БРХК',
  originalName: '20251022 БРХК Посвящение в профессию — 001.jpg'
});

const initiation014Portrait = archiveAsset({
  id: 'initiation014Portrait',
  filename: 'initiation-014-portrait.webp',
  variantFilename: 'initiation-014-portrait-320.webp',
  width: 480,
  height: 720,
  variantWidth: 320,
  variantHeight: 480,
  defaultAlt: 'Участница балетного номера на сцене БРХК',
  originalName: '20251022 БРХК Посвящение в профессию — 014.jpg'
});

const initiation034Portrait = archiveAsset({
  id: 'initiation034Portrait',
  filename: 'initiation-034-portrait.webp',
  variantFilename: 'initiation-034-portrait-320.webp',
  width: 480,
  height: 720,
  variantWidth: 320,
  variantHeight: 480,
  defaultAlt: 'Исполнитель балетного номера в прыжке на сцене БРХК',
  originalName: '20251022 БРХК Посвящение в профессию — 034.jpg'
});

const initiation039Portrait = archiveAsset({
  id: 'initiation039Portrait',
  filename: 'initiation-039-portrait.webp',
  variantFilename: 'initiation-039-portrait-320.webp',
  width: 480,
  height: 720,
  variantWidth: 320,
  variantHeight: 480,
  defaultAlt: 'Исполнительница представляет классический балетный номер БРХК',
  originalName: '20251022 БРХК Посвящение в профессию — 039.jpg'
});

const initiation043Landscape = archiveAsset({
  id: 'initiation043Landscape',
  filename: 'initiation-043-landscape.webp',
  variantFilename: 'initiation-043-landscape-480.webp',
  width: 1080,
  height: 720,
  variantWidth: 480,
  variantHeight: 320,
  defaultAlt: 'Исполнительница представляет классический балетный номер на сцене БРХК',
  originalName: '20251022 БРХК Посвящение в профессию — 043.jpg'
});

const initiation052Landscape = archiveAsset({
  id: 'initiation052Landscape',
  filename: 'initiation-052-landscape.webp',
  variantFilename: 'initiation-052-landscape-480.webp',
  width: 1080,
  height: 720,
  variantWidth: 480,
  variantHeight: 320,
  defaultAlt: 'Участники БРХК исполняют костюмированный номер на сцене',
  originalName: '20251022 БРХК Посвящение в профессию — 052.jpg'
});

const stageDesktop = rendition('initiation-015-landscape.webp', 1080, 720);
const stageMobile = rendition('initiation-014-portrait.webp', 480, 720);
const stageHero = {
  id: 'stageHero',
  ...stageDesktop,
  defaultAlt: 'Сценическое выступление участников БРХК',
  source: yandexSource,
  originalName: '20251022 БРХК Посвящение в профессию — 015.jpg',
  rightsStatus: archiveRightsStatus,
  credit: archiveCredit,
  derivativeNote,
  variants: [
    rendition('initiation-015-landscape-480.webp', 480, 320),
    stageDesktop
  ],
  mobile: {
    ...stageMobile,
    originalName: '20251022 БРХК Посвящение в профессию — 014.jpg',
    variants: [
      rendition('initiation-014-portrait-320.webp', 320, 480),
      stageMobile
    ]
  }
};

function studioAsset(id, filename, variantFilename, width, height, variantWidth, variantHeight, defaultAlt) {
  const main = rendition(filename, width, height);
  return {
    id,
    ...main,
    defaultAlt,
    source: 'repository:public/assets/images/studio-tutu.webp',
    originalName: 'studio-tutu.webp',
    rightsStatus: archiveRightsStatus,
    credit: archiveCredit,
    variants: [rendition(variantFilename, variantWidth, variantHeight), main]
  };
}

const studioPortrait = studioAsset(
  'studioPortrait',
  'studio-tutu.webp',
  'studio-tutu-320.webp',
  480,
  720,
  320,
  480,
  'Балетный костюм в учебном зале БРХК'
);

const studioLandscape = studioAsset(
  'studioLandscape',
  'studio-tutu-landscape.webp',
  'studio-tutu-landscape-320.webp',
  480,
  320,
  320,
  213,
  'Балетный костюм и экран с занятием в учебном зале БРХК'
);

const studioSquare = studioAsset(
  'studioSquare',
  'studio-tutu-square.webp',
  'studio-tutu-square-320.webp',
  480,
  480,
  320,
  320,
  'Балетный костюм в учебном зале БРХК'
);

const logo = {
  id: 'logo',
  ...rendition('brhk-monogram.png', 756, 410),
  defaultAlt: 'Фирменный знак Бурятского республиканского хореографического колледжа',
  source: 'repository:public/assets/images/brhk-monogram.png',
  originalName: '1-Фото-1.jpg',
  rightsStatus: 'client-provided-pending-final-rights-check',
  credit: null,
  variants: [rendition('brhk-monogram.png', 756, 410)]
};

function alias(asset, id) {
  return { ...asset, id, aliasOf: asset.id };
}

export const mediaAssets = [
  logo,
  stageHero,
  alias(stageHero, 'stage'),
  initiation001Portrait,
  initiation001Square,
  initiation014Portrait,
  initiation034Portrait,
  initiation039Portrait,
  initiation043Landscape,
  initiation052Landscape,
  alias(studioPortrait, 'studio'),
  studioPortrait,
  studioLandscape,
  studioSquare
];

export const mediaById = Object.freeze(Object.fromEntries(mediaAssets.map((asset) => [asset.id, asset])));
