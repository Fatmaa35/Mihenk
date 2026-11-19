import { useFonts } from 'expo-font'
import {
  BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque'
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'

/** Web'deki başlık ve metin yazı tipleri; uygulama açılmadan önce yüklenir. */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  })
  // Yazı tipi yüklenemezse uygulama açılmadan beklemez; sistem yazı tipine düşer.
  return loaded || Boolean(error)
}
