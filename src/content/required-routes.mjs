export const CORE_REQUIRED_ROUTES = Object.freeze([
  '/',
  '/about/',
  '/education/',
  '/admission/',
  '/students/',
  '/news/',
  '/events/',
  '/gallery/',
  '/documents/',
  '/creative-industries/',
  '/ballet-for-all/',
  '/contacts/',
  '/privacy/',
  '/consent/',
  '/accessibility/',
  '/sveden/'
]);

export const SVEDEN_REQUIRED_ROUTES = Object.freeze([
  '/sveden/common/',
  '/sveden/struct/',
  '/sveden/document/',
  '/sveden/education/',
  '/sveden/eduStandarts/',
  '/sveden/managers/',
  '/sveden/employees/',
  '/sveden/objects/',
  '/sveden/grants/',
  '/sveden/paid_edu/',
  '/sveden/budget/',
  '/sveden/vacant/',
  '/sveden/catering/',
  '/sveden/inter/'
]);

export const PRESERVED_INFORMATION_ROUTES = Object.freeze([
  '/sveden/ovz/',
  '/about/history/',
  '/about/alumni/',
  '/about/pride/',
  '/about/independent-quality-assessment/',
  '/about/research/',
  '/about/recreation-base/',
  '/admission/rules/',
  '/admission/commission-hours/',
  '/admission/results/',
  '/admission/information/',
  '/students/e-journal/',
  '/students/schedule/',
  '/students/vpr/',
  '/students/vsosh/',
  '/students/ege/',
  '/students/oge/',
  '/students/psychological-service/',
  '/students/employment/',
  '/students/educational-work/',
  '/events/concerts/',
  '/events/competitions/',
  '/additional-education/children/',
  '/additional-education/adults/',
  '/culture-for-schoolchildren/',
  '/culture-for-schoolchildren/roadmap/',
  '/culture-for-schoolchildren/recommendations/',
  '/culture-for-schoolchildren/mentors/',
  '/culture-for-schoolchildren/actions/',
  '/resources/',
  '/resources/ballet-buryatia-dictionary/',
  '/education/professional-standards/',
  '/safety/',
  '/documents/sout/',
  '/anti-corruption/',
  '/faq/',
  '/sitemap/'
]);

export const REQUIRED_ROUTES = Object.freeze([
  ...CORE_REQUIRED_ROUTES,
  ...SVEDEN_REQUIRED_ROUTES,
  ...PRESERVED_INFORMATION_ROUTES
]);

export function missingRequiredRoutes(routes) {
  const available = routes instanceof Set ? routes : new Set(routes);
  return REQUIRED_ROUTES.filter((route) => !available.has(route));
}
