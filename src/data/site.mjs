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
      src: '/assets/images/brhk-logo.png',
      alt: 'Логотип Бурятского республиканского хореографического колледжа'
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
    { href: '/about/', label: 'Колледж' },
    { href: '/education/', label: 'Образование' },
    { href: '/admission/', label: 'Абитуриентам' },
    { href: '/students/', label: 'Студентам' },
    { href: '/news/', label: 'Новости' },
    { href: '/sveden/', label: 'Сведения' },
    { href: '/admission/', label: 'Поступить', cta: true }
  ],
  utilityNavigation: [
    { href: '/sveden/', label: 'Сведения об организации' }
  ],
  quickLinks: [
    { href: '/admission/', label: 'Абитуриентам' },
    { href: '/documents/', label: 'Документы' },
    { href: '/students/', label: 'Студентам' },
    { href: '/sveden/', label: 'Сведения об организации' }
  ],
  sideNavigation: [
    { href: '/about/', label: 'О колледже' },
    { href: '/education/', label: 'Образование' },
    { href: '/admission/', label: 'Абитуриентам' },
    { href: '/students/', label: 'Студентам' },
    { href: '/news/', label: 'Новости' },
    { href: '/documents/', label: 'Документы' },
    { href: '/sveden/', label: 'Сведения об организации' }
  ],
  footerNavigation: [
    { href: '/about/', label: 'О колледже' },
    { href: '/education/', label: 'Образование' },
    { href: '/admission/', label: 'Поступление' },
    { href: '/news/', label: 'Новости' }
  ],
  legalNavigation: [
    { href: '/privacy/', label: 'Персональные данные' },
    { href: '/consent/', label: 'Согласие' },
    { href: '/accessibility/', label: 'Доступность сайта' }
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
      title: 'Сцена начинается здесь',
      description: 'Классическая балетная традиция, культура Бурятии и современные творческие индустрии.',
      image: 'stage',
      imageAlt: '',
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
      image: 'studio',
      imageAlt: 'Балетный костюм в учебном зале БРХК',
      imageLabel: 'Ежедневная работа',
      imageCaption: 'От класса — к большой сцене',
      stats: [
        { value: '1961', label: 'год основания училища' },
        { value: '600+', label: 'выпускников профессиональной сцены' },
        { value: '2', label: 'основные программы СПО' },
        { value: '8 лет', label: 'траектория искусства балета' }
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
      image: 'stage',
      alt: 'Участники гала-концерта БРХК',
      caption: 'Гала-концерт и большая сцена'
    },
    {
      image: 'studio',
      alt: 'Балетный костюм в учебном зале',
      caption: 'Учебный процесс и костюм',
      compact: true
    }
  ]
};
