const messages = {
  tr: { cancel: 'Vazgeç', confirm: 'Onayla', actionTitle: 'İşlem önizlemesi', planTitle: 'Okuma planı', targetDate: 'Bitirme tarihi', reminder: 'Hatırlatıcı açık', weekdays: 'Okunmayacak günler' },
  en: { cancel: 'Cancel', confirm: 'Confirm', actionTitle: 'Action preview', planTitle: 'Reading plan', targetDate: 'Target date', reminder: 'Reminder enabled', weekdays: 'Days off' }
} as const
export type Locale = keyof typeof messages
export const locale: Locale = document.documentElement.lang === 'en' ? 'en' : 'tr'
export const t = (key: keyof typeof messages.tr) => messages[locale][key]
