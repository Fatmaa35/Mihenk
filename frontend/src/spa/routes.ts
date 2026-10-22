/** Uygulama içi yollar. Backend `SPA_ROUTES` listesi bu değerlerle aynı tutulmalıdır. */
export const routes = {
  signIn: '/giris',
  today: '/bugun',
  discover: '/kesfet',
  library: '/kitapligim',
  clubs: '/kulupler',
  focus: '/odak',
} as const

/** Henüz yeni arayüze taşınmamış bölümler klasik arayüzde açılır. */
export const classicViews = [
  { view: 'community', label: 'Topluluk' },
  { view: 'insights', label: 'Okuma analizi' },
  { view: 'alerts', label: 'Fiyat alarmları' },
  { view: 'settings', label: 'Ayarlar' },
] as const

export const classicUrl = (view?: string) => (view ? `/classic?view=${encodeURIComponent(view)}` : '/classic')
