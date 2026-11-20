import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import {
  LivePriceStep, formatPrice, priceSummary, remainingOffers, useLiveOffers, useStoredOffers,
} from '../../api/offers'
import { Button, Card } from '../../ui/components'
import { BORDER, fonts, radius, space, theme } from '../../ui/theme'

function Row({ name, priceMinor, currency, url, note, state }: {
  name: string
  priceMinor: number | null
  currency: string | null
  url: string | null
  note?: string | null
  state?: LivePriceStep['state']
}) {
  const found = priceMinor !== null && url
  const body = (
    <View style={[styles.row, found ? styles.rowFound : null]}>
      <Text style={styles.store} numberOfLines={1}>{name}</Text>
      {found ? (
        <View style={styles.priceBox}>
          <Text style={styles.price}>{formatPrice(priceMinor, currency)}</Text>
          <Feather name="external-link" size={14} color={theme.accentSoftInk} />
        </View>
      ) : (
        <Text style={styles.note} numberOfLines={1}>
          {state === 'searching' ? 'Aranıyor…' : note}
        </Text>
      )}
    </View>
  )
  if (!found) return body
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${name}, ${formatPrice(priceMinor, currency)}, mağazada aç`}
      onPress={() => void Linking.openURL(url)}
    >
      {body}
    </Pressable>
  )
}

/**
 * Kitabın mağaza fiyatları. Ekran açılınca izinli mağazalarda canlı arama
 * başlar ve sonuçlar geldikçe satırlar dolar; canlı aranmayan mağazaların
 * kayıtlı fiyatları listenin sonunda durur.
 */
export function BookPrices({ bookId }: { bookId: string }) {
  const stored = useStoredOffers(bookId)
  const { lookup, running, busy, error, refresh } = useLiveOffers(bookId)
  const steps = lookup?.retailers ?? []
  const rest = remainingOffers(stored.data, steps)

  return (
    <Card>
      <Text style={styles.title}>Mağaza fiyatları</Text>

      <View style={styles.list}>
        {steps.map((step) => (
          <Row
            key={step.retailer_id}
            name={step.retailer_name}
            priceMinor={step.price_minor}
            currency={step.currency}
            url={step.product_url}
            note={step.message}
            state={step.state}
          />
        ))}
        {rest.map((offer) => (
          <Row
            key={offer.product_url}
            name={offer.retailer_name}
            priceMinor={offer.price_minor}
            currency={offer.currency}
            url={offer.product_url}
          />
        ))}
        {steps.length === 0 && rest.length === 0 ? (
          <Text style={styles.note}>Bu kitap için henüz fiyat yok.</Text>
        ) : null}
      </View>

      <Text style={styles.summary} accessibilityRole="text">
        {busy ? 'Şu an çok sayıda arama sürüyor; birkaç dakika sonra tekrar dene.' : error ?? priceSummary(lookup)}
      </Text>

      <Button
        label="Fiyatları yenile"
        variant="quiet"
        icon={<Feather name="refresh-cw" size={16} color={theme.ink} />}
        onPress={refresh}
        loading={running}
        disabled={running}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 17, color: theme.ink },
  list: { gap: space[2] },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3],
    backgroundColor: theme.surface2, borderRadius: radius.s, paddingHorizontal: space[3], paddingVertical: space[3],
  },
  rowFound: { backgroundColor: theme.accentSoft, borderWidth: BORDER, borderColor: theme.line },
  store: { fontFamily: fonts.bodyBold, fontSize: 15, color: theme.ink, flexShrink: 1 },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontFamily: fonts.bodyBold, fontSize: 16, color: theme.accentSoftInk },
  note: { fontFamily: fonts.body, fontSize: 13, color: theme.ink2, flexShrink: 1, textAlign: 'right' },
  summary: { fontFamily: fonts.body, fontSize: 13, color: theme.ink2 },
})
