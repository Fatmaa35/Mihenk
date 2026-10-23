/** Uygulama içi yollar. Backend `SPA_ROUTES` listesi bu değerlerle aynı tutulmalıdır. */
export const routes = {
  signIn: '/giris',
  today: '/bugun',
  discover: '/kesfet',
  library: '/kitapligim',
  community: '/topluluk',
  clubs: '/kulupler',
  focus: '/odak',
  profile: '/profil',
  notifications: '/bildirimler',
  settings: '/ayarlar',
  admin: '/yonetim',
} as const


/** Asistanın "ekranda ne var" bağlamı için rota → backend görünüm adı. */
export function activeViewFor(pathname: string): 'discover' | 'catalog' | 'library' | 'insights' | 'alerts' {
  if (pathname.startsWith(routes.discover)) return 'catalog'
  if (pathname.startsWith(routes.library)) return 'library'
  if (pathname.startsWith(routes.profile)) return 'insights'
  if (pathname.startsWith(routes.notifications)) return 'alerts'
  return 'discover'
}
