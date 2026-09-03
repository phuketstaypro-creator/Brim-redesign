import { svedenSections } from './sveden.mjs';

export const institutionalNavigation = [
  { href: '/about/independent-quality-assessment/', label: 'Независимая оценка качества условий' },
  { href: '/students/psychological-service/', label: 'Психологическая служба' },
  { href: '/safety/', label: 'Безопасность учреждения и информационная безопасность' },
  { href: '/documents/sout/', label: 'Специальная оценка условий труда (СОУТ)' },
  { href: '/anti-corruption/', label: 'Противодействие коррупции' },
  { href: '/about/research/', label: 'Научно-исследовательская деятельность' },
  { href: '/education/professional-standards/', label: 'Профессиональные стандарты' },
  { href: '/students/employment/', label: 'Содействие трудоустройству выпускников' },
  { href: '/about/recreation-base/', label: 'База отдыха' },
  { href: '/students/educational-work/', label: 'Воспитательная работа' },
  { href: '/faq/', label: 'Часто задаваемые вопросы' }
];

const mandatoryDisclosureLinks = svedenSections
  .filter((section) => section.group === 'mandatory')
  .map((section) => ({ href: section.href, label: section.title, group: 'Обязательные подразделы' }));

const legacyDisclosureLinks = svedenSections
  .filter((section) => section.group === 'legacy')
  .map((section) => ({ href: section.href, label: section.title, group: 'Сохранённые адреса' }));

export const site = {
  locale: 'ru',
  baseUrl: 'https://brim-redesign.vercel.app',
  shortName: 'БРХК',
  name: 'Бурятский республиканский хореографический колледж',
  legalName: 'ГАПОУ РБ «Бурятский республиканский хореографический колледж имени Л. П. Сахьяновой и П. Т. Абашеева»',
  title: 'БРХК — сцена начинается здесь',
  description: 'Редизайн сайта Бурятского республиканского хореографического колледжа имени Л. П. Сахьяновой и П. Т. Абашеева',
  themeColor: '#160f10',
  utilityLabel: 'Официальный сайт образовательной организации',
  assets: {
    logo: {
      src: '/assets/images/brhk-logo-full.png',
      width: 1705,
      height: 677,
      alt: 'Полный логотип Бурятского республиканского хореографического колледжа'
    },
    stage: {
      src: '/assets/images/studio-tutu-landscape.webp',
      width: 480,
      height: 320,
      alt: 'Балетный костюм и экран с занятием в учебном зале БРХК'
    },
    studio: {
      src: '/assets/images/studio-tutu.webp',
      width: 480,
      height: 720,
      alt: 'Балетный костюм в учебном зале БРХК'
    }
  },
  navigation: [
    {
      label: 'Колледж',
      children: [
        { href: '/about/', label: 'О колледже' },
        { href: '/about/history/', label: 'История' },
        { href: '/about/alumni/', label: 'Выпускники' },
        { href: '/about/pride/', label: 'Гордость колледжа' },
        { href: '/about/independent-quality-assessment/', label: 'Независимая оценка качества' },
        { href: '/about/research/', label: 'Научно-исследовательская деятельность' },
        { href: '/about/recreation-base/', label: 'База отдыха' },
        { href: '/contacts/', label: 'Контакты' }
      ]
    },
    {
      label: 'Образование',
      children: [
        { href: '/education/', label: 'Образовательные программы', group: 'Программы' },
        { href: '/creative-industries/', label: 'Школа креативных индустрий', group: 'Программы' },
        { href: '/ballet-for-all/', label: 'Балет для всех', group: 'Программы' },
        { href: '/additional-education/children/', label: 'Дополнительное образование для детей', group: 'Дополнительное образование' },
        { href: '/additional-education/adults/', label: 'Дополнительное образование для взрослых', group: 'Дополнительное образование' },
        { href: '/education/professional-standards/', label: 'Профессиональные стандарты', group: 'Нормативные материалы' }
      ]
    },
    {
      label: 'Поступление',
      children: [
        { href: '/admission/', label: 'Абитуриентам' },
        { href: '/admission/rules/', label: 'Правила приёма' },
        { href: '/admission/commission-hours/', label: 'График работы приёмной комиссии' },
        { href: '/admission/results/', label: 'Результаты вступительных испытаний' },
        { href: '/admission/information/', label: 'Дополнительная информация' },
        { href: '/sveden/vacant/', label: 'Вакантные места для приёма (перевода)' }
      ]
    },
    {
      label: 'Студентам',
      children: [
        { href: '/students/', label: 'Обучающимся', group: 'Учёба' },
        { href: '/students/e-journal/', label: 'Электронный журнал и дневник', group: 'Учёба' },
        { href: '/students/schedule/', label: 'Расписание', group: 'Учёба' },
        { href: '/students/vpr/', label: 'ВПР', group: 'Аттестация и олимпиады' },
        { href: '/students/vsosh/', label: 'ВСОШ', group: 'Аттестация и олимпиады' },
        { href: '/students/ege/', label: 'ЕГЭ', group: 'Аттестация и олимпиады' },
        { href: '/students/oge/', label: 'ОГЭ', group: 'Аттестация и олимпиады' },
        { href: '/students/psychological-service/', label: 'Психологическая служба', group: 'Поддержка' },
        { href: '/students/employment/', label: 'Содействие трудоустройству', group: 'Поддержка' },
        { href: '/students/educational-work/', label: 'Воспитательная работа', group: 'Поддержка' },
        { href: '/safety/', label: 'Безопасность', group: 'Поддержка' }
      ]
    },
    {
      label: 'Новости и творчество',
      children: [
        { href: '/news/', label: 'Новости', group: 'Медиа' },
        { href: '/events/', label: 'Афиша', group: 'Медиа' },
        { href: '/events/concerts/', label: 'Концерты', group: 'Медиа' },
        { href: '/events/competitions/', label: 'Конкурсы', group: 'Медиа' },
        { href: '/gallery/', label: 'Галерея', group: 'Медиа' },
        { href: '/culture-for-schoolchildren/', label: 'Культура для школьников', group: 'Культура для школьников' },
        { href: '/culture-for-schoolchildren/roadmap/', label: 'Дорожная карта проекта', group: 'Культура для школьников' },
        { href: '/culture-for-schoolchildren/recommendations/', label: 'Методические рекомендации', group: 'Культура для школьников' },
        { href: '/culture-for-schoolchildren/mentors/', label: 'Региональные наставники', group: 'Культура для школьников' },
        { href: '/culture-for-schoolchildren/actions/', label: 'Всероссийские акции', group: 'Культура для школьников' },
        { href: '/resources/', label: 'Онлайн-ресурсы', group: 'Онлайн-ресурсы' },
        { href: '/resources/ballet-buryatia-dictionary/', label: 'Словарь «Балет Бурятии»', group: 'Онлайн-ресурсы' }
      ]
    },
    {
      label: 'Сведения',
      children: [
        { href: '/sveden/', label: 'Все сведения об образовательной организации', group: 'Обзор' },
        ...mandatoryDisclosureLinks,
        ...institutionalNavigation.map((item) => ({ ...item, group: 'Сервисы и открытость' })),
        { href: '/documents/', label: 'Документы колледжа', group: 'Сервисы и открытость' },
        ...legacyDisclosureLinks,
        { href: '/privacy/', label: 'Политика обработки персональных данных', group: 'Правовая информация' },
        { href: '/consent/', label: 'Согласие на обработку персональных данных', group: 'Правовая информация' },
        { href: '/accessibility/', label: 'Доступность сайта', group: 'Правовая информация' },
        { href: '/sitemap/', label: 'Карта сайта', group: 'Навигация' }
      ]
    },
    { href: '/admission/', label: 'Поступить', cta: true }
  ],
  utilityNavigation: [
    { href: '/contacts/', label: 'Контакты' },
    { href: '/sitemap/', label: 'Карта сайта' },
    { href: '/sveden/', label: 'Сведения об организации' }
  ],
  quickLinks: [
    { href: '/admission/', label: 'Абитуриентам' },
    { href: '/documents/', label: 'Документы' },
    { href: '/students/', label: 'Студентам' },
    { href: '/sveden/', label: 'Сведения об организации' }
  ],
  usefulLinks: [
    {
      href: 'https://bus.gov.ru/qrcode/rate/231927?agencyId=232834',
      label: 'Оцените условия оказания услуг'
    },
    {
      href: 'https://minkultrb.ru/',
      label: 'Министерство культуры Республики Бурятия'
    },
    {
      href: 'https://edu.gov.ru/',
      label: 'Министерство просвещения Российской Федерации'
    },
    {
      href: 'https://egov-buryatia.ru/minobr/',
      label: 'Министерство образования и науки Республики Бурятия'
    },
    {
      href: 'https://culture.gov.ru/',
      label: 'Министерство культуры Российской Федерации'
    }
  ],
  socialLinks: [
    { href: 'https://vk.ru/uubrhk03', label: 'БРХК во ВКонтакте' },
    { href: 'https://max.ru/id323070083_gos', label: 'БРХК в MAX' }
  ],
  sideNavigation: [
    { href: '/about/', label: 'О колледже' },
    { href: '/education/', label: 'Образование' },
    { href: '/admission/', label: 'Абитуриентам' },
    { href: '/students/', label: 'Студентам' },
    { href: '/news/', label: 'Новости' },
    { href: '/documents/', label: 'Документы' },
    { href: '/sveden/', label: 'Сведения об организации' },
    { href: '/sitemap/', label: 'Карта сайта' }
  ],
  footerNavigation: [
    { href: '/about/', label: 'О колледже' },
    { href: '/education/', label: 'Образование' },
    { href: '/admission/', label: 'Поступление' },
    { href: '/news/', label: 'Новости' },
    { href: '/sveden/', label: 'Сведения' },
    { href: '/sitemap/', label: 'Карта сайта' }
  ],
  institutionalNavigation,
  legalNavigation: [
    { href: '/privacy/', label: 'Персональные данные' },
    { href: '/consent/', label: 'Согласие' },
    { href: '/accessibility/', label: 'Доступность сайта' }
  ],
  officialNavigation: [
    { href: 'https://edu.gov.ru/', label: 'Минпросвещения России' },
    { href: 'https://minobrnauki.gov.ru/', label: 'Минобрнауки России' }
  ],
  contacts: {
    city: 'Улан-Удэ',
    addresses: ['ул. Ербанова, 3', 'пр. Победы, 18'],
    phone: '+7 (3012) 21-23-13',
    phoneHref: 'tel:+73012212313',
    email: 'brhk@govrb.ru',
    emailHref: 'mailto:brhk@govrb.ru'
  },
  footer: {
    status: 'Рабочая версия редизайна · 2026',
    disclaimer: 'Контент и документы подлежат финальной сверке колледжем.'
  },
  home: {
    hero: {
      eyebrow: 'Улан-Удэ · профессиональное образование в искусстве',
      title: 'Сцена\nначинается здесь',
      description: 'Классическая балетная традиция, культура Бурятии и современные творческие индустрии.',
      image: 'stageHero',
      imageAlt: 'Сценическое выступление учащихся БРХК',
      actions: [
        { href: '/admission/', label: 'Поступить ↗', style: 'light' },
        { href: '/education/', label: 'Программы', style: 'outline' }
      ]
    },
    ticker: [
      'БРХК · Искусство балета',
      'Искусство танца',
      'Сценическая практика',
      'Культура Бурятии',
      'Школа креативных индустрий',
      'БРХК · Искусство балета',
      'Искусство танца',
      'Балет для всех'
    ],
    about: {
      index: '01',
      label: 'О колледже',
      title: 'Дисциплина.\nХарактер. Искусство.',
      lead: 'Профессиональная школа начинается задолго до выхода на большую сцену.',
      manifestLabel: 'Манифест БРХК',
      manifest: 'Не просто научить движению. Научить говорить со зрителем без единого слова.',
      manifestNote: 'Колледж объединяет академическую школу, национальную культуру и живую сценическую практику.',
      image: 'initiation001Portrait',
      imageAlt: 'Участник исполняет хореографический номер на посвящении в профессию БРХК',
      imageLabel: 'Посвящение в профессию',
      imageCaption: 'Сценическая практика БРХК',
      stats: [
        { value: '1961', label: 'год основания училища' },
        { value: '2', label: 'основные программы СПО' },
        {
          value: '3',
          label: 'образования одновременно',
          details: ['Школа', 'Музыка', 'Балет']
        },
        { value: '700+', label: 'выпускников' }
      ]
    },
    education: {
      index: '02',
      label: 'Образование',
      title: 'Программы,\nкоторые ведут на сцену',
      lead: 'Основные программы СПО и дополнительные направления собраны в одном образовательном контуре.'
    },
    news: {
      index: '03',
      label: 'Новости',
      title: 'Колледж\nсегодня',
      lead: 'Редакционная лента автоматически подстраивается под вертикальные, горизонтальные и квадратные фотографии.'
    },
    admission: {
      index: '04',
      label: 'Поступление',
      title: 'Ваш путь\nв БРХК',
      lead: 'Просмотр, медицинская комиссия, творческий отбор и документы — без бюрократического тумана.',
      steps: [
        {
          title: 'Выберите программу',
          description: 'Возраст, срок обучения, квалификация и требования к подготовке.',
          href: '/education/',
          linkLabel: 'Смотреть программы →'
        },
        {
          title: 'Запишитесь на просмотр',
          description: 'Даты, формат, медицинские заключения и контакты приёмной комиссии.',
          href: '/admission/',
          linkLabel: 'Порядок поступления →'
        },
        {
          title: 'Пройдите отбор',
          description: 'Физические данные, музыкальность, координация и сценический номер.',
          href: 'tel:+73012212313',
          linkLabel: 'Связаться с приёмной →'
        }
      ]
    },
    gallery: {
      index: '05',
      label: 'Галерея',
      title: 'Люди, пространство,\nсцена'
    }
  },
  gallery: [
    {
      image: 'initiation052Landscape',
      alt: 'Участники исполняют костюмированный номер на сцене БРХК',
      caption: '«Посвящение в профессию» · архив БРХК'
    },
    {
      image: 'initiation039Portrait',
      alt: 'Участница исполняет классический балетный номер на сцене БРХК',
      caption: 'Классический номер · архив БРХК',
      compact: true
    },
    {
      image: 'initiation043Landscape',
      alt: 'Участница исполняет классический балетный номер на сцене БРХК',
      caption: 'Сценическая практика · архив БРХК'
    }
  ]
};
