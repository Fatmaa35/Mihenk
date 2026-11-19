/**
 * Web uygulamasının tasarım belirteçlerinin birebir karşılığı
 * (`frontend/src/spa/theme/tokens.css`). Mihenk'in görünüşü kalın siyah
 * çerçeve, sert gölge ve çivit mavisi vurgu üzerine kurulu; mobil de aynı
 * dili konuşsun diye renkler tahmin edilmez, oradan alınır.
 */
export const theme = {
  bg: '#FBFAF7',
  surface: '#FFFFFF',
  surface2: '#F3F1EC',
  ink: '#15151A',
  ink2: '#55545E',
  ink3: '#6E6D78',
  line: '#15151A',
  lineSoft: '#E7E4DC',
  accent: '#3D3AC9',
  accentInk: '#FFFFFF',
  accentSoft: '#E7E5FF',
  accentSoftInk: '#2B28A0',
  danger: '#B42318',
  dangerSoft: '#FDE8E6',
  success: '#1E7A4C',
  gold: '#E0A91A',
} as const

/** Kitap kapağı yerine geçen renkli karo için; başlıktan seçilir, hep aynı kalır. */
export const COVER_COLORS = ['#2F5D4A', '#8A5A2B', '#2B28A0', '#7A2E3F', '#3F5068', '#5B4A2E'] as const

export const radius = { xs: 8, s: 12, m: 18, l: 26, pill: 999 } as const
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 } as const

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayExtra: 'BricolageGrotesque_800ExtraBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const

/** Sert gölgenin kalınlığı: web'deki `4px 4px 0` ile aynı. */
export const SHADOW_OFFSET = 4
export const BORDER = 2
