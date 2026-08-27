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
  '/sveden/employees/',
  '/sveden/objects/',
  '/sveden/grants/',
  '/sveden/paid_edu/',
  '/sveden/budget/',
  '/sveden/vacant/',
  '/sveden/ovz/',
  '/sveden/catering/',
  '/sveden/inter/'
]);

export const REQUIRED_ROUTES = Object.freeze([
  ...CORE_REQUIRED_ROUTES,
  ...SVEDEN_REQUIRED_ROUTES
]);

export function missingRequiredRoutes(routes) {
  const available = routes instanceof Set ? routes : new Set(routes);
  return REQUIRED_ROUTES.filter((route) => !available.has(route));
}
