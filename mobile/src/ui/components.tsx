import { useState } from 'react'
import {
  ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native'
import { BORDER, COVER_COLORS, SHADOW_OFFSET, fonts, radius, space, theme } from './theme'

/**
 * Mihenk'in görsel dili: beyaz yüzey, iki piksel siyah çerçeve ve çerçevenin
 * sağ altına düşen sert gölge. Android'de gerçek gölgeler yumuşak olduğu için
 * gölge, arkaya konan ikinci bir katmanla çizilir.
 */
export function Hard({ children, radius: r = radius.m, style }: {
  children: React.ReactNode
  radius?: number
  style?: ViewStyle
}) {
  return (
    <View style={[{ backgroundColor: theme.line, borderRadius: r }, style]}>
      <View style={{ transform: [{ translateX: -SHADOW_OFFSET }, { translateY: -SHADOW_OFFSET }] }}>
        {children}
      </View>
    </View>
  )
}

export function Card({ children, style, tone = 'surface' }: {
  children: React.ReactNode
  style?: ViewStyle
  tone?: 'surface' | 'danger'
}) {
  return (
    <Hard style={styles.hardSpacing}>
      <View style={[styles.card, tone === 'danger' && styles.cardDanger, style]}>{children}</View>
    </Hard>
  )
}

export function Button({ label, onPress, loading, variant = 'primary', disabled, icon }: {
  label: string
  onPress: () => void
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  disabled?: boolean
  icon?: React.ReactNode
}) {
  const inactive = disabled || loading
  const body = (
    <View style={[
      styles.button,
      variant === 'primary' && styles.buttonPrimary,
      variant === 'secondary' && styles.buttonSecondary,
      variant === 'quiet' && styles.buttonQuiet,
      variant === 'danger' && styles.buttonDanger,
      inactive && styles.inactive,
    ]}>
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? theme.accentInk : theme.ink} />
        : (
          <>
            {icon}
            <Text style={[styles.buttonLabel, variant === 'primary' && styles.buttonLabelLight]}>{label}</Text>
          </>
        )}
    </View>
  )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => (pressed && !inactive ? styles.pressed : undefined)}
    >
      {variant === 'quiet' ? body : <Hard radius={radius.s}>{body}</Hard>}
    </Pressable>
  )
}

export function Pill({ label, tone = 'soft', count }: {
  label: string
  tone?: 'soft' | 'active' | 'plain'
  count?: number
}) {
  return (
    <View style={[styles.pill, tone === 'soft' && styles.pillSoft, tone === 'active' && styles.pillActive]}>
      <Text style={[styles.pillLabel, tone === 'active' && styles.pillLabelActive]}>{label}</Text>
      {count !== undefined && (
        <View style={styles.pillCount}>
          <Text style={styles.pillCountLabel}>{count}</Text>
        </View>
      )}
    </View>
  )
}

/** Kapak görseli yoksa başlığı taşıyan renkli karo; web'deki karşılığıyla aynı fikir. */
/**
 * Kitap kapağı. Sunucudan kapak adresi geldiyse görsel gösterilir; gelmediyse
 * ISBN üzerinden Open Library denenir; o da yoksa başlığı taşıyan renkli karo
 * çizilir. Karo rengi başlıktan üretilir, aynı kitap hep aynı renkte görünür.
 */
export function Cover({ title, url, isbn, size = 'm' }: {
  title: string
  url?: string | null
  isbn?: string | null
  size?: 's' | 'm' | 'l'
}) {
  const [broken, setBroken] = useState(false)
  const index = [...title].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % COVER_COLORS.length
  const box = size === 'l' ? styles.coverLarge : size === 's' ? styles.coverSmall : styles.coverMedium
  const label = size === 'l' ? styles.coverLabelLarge : size === 's' ? styles.coverLabelSmall : null
  const digits = (isbn ?? '').replace(/[^0-9Xx]/g, '')
  // `default=false` olmadan Open Library kapağı olmayan kitap için boş bir
  // görsel döner; bu haliyle 404 verir ve karoya düşeriz.
  const source = url || (digits ? `https://covers.openlibrary.org/b/isbn/${digits}-M.jpg?default=false` : null)

  if (source && !broken) {
    return (
      <Image
        source={{ uri: source }}
        style={[styles.cover, box]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={`${title} kapağı`}
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <View style={[styles.cover, box, { backgroundColor: COVER_COLORS[index] }]}>
      <Text style={[styles.coverLabel, label]} numberOfLines={size === 'l' ? 5 : 3} adjustsFontSizeToFit>
        {title}
      </Text>
    </View>
  )
}

export function Progress({ page, total }: { page: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.round((page / total) * 100)) : 0
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressTrack} accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: page }}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{page}/{total}</Text>
    </View>
  )
}

export function Field({ label, hint, ...props }: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={theme.ink3}
        accessibilityLabel={label}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

export function Notice({ message, tone = 'error' }: { message: string; tone?: 'error' | 'info' }) {
  return (
    <View style={[styles.notice, tone === 'info' && styles.noticeInfo]} accessibilityRole="alert">
      <Text style={[styles.noticeText, tone === 'info' && styles.noticeTextInfo]}>{message}</Text>
    </View>
  )
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.accent} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  )
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyText}>{description}</Text> : null}
    </View>
  )
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headingSubtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  hardSpacing: { marginRight: SHADOW_OFFSET, marginBottom: SHADOW_OFFSET },
  card: {
    backgroundColor: theme.surface, borderRadius: radius.m, borderWidth: BORDER,
    borderColor: theme.line, padding: space[4], gap: space[2],
  },
  cardDanger: { borderColor: theme.danger, backgroundColor: theme.dangerSoft },

  button: {
    minHeight: 50, borderRadius: radius.s, borderWidth: BORDER, borderColor: theme.line,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space[2],
    paddingHorizontal: space[4], backgroundColor: theme.surface,
  },
  buttonPrimary: { backgroundColor: theme.accent },
  buttonSecondary: { backgroundColor: theme.surface },
  buttonQuiet: { borderWidth: 0, backgroundColor: theme.surface2, minHeight: 46 },
  buttonDanger: { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
  buttonLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: theme.ink },
  buttonLabelLight: { color: theme.accentInk },
  pressed: { opacity: 0.82 },
  inactive: { opacity: 0.55 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingHorizontal: space[3], paddingVertical: 7, borderRadius: radius.pill,
  },
  pillSoft: { backgroundColor: theme.accentSoft },
  pillActive: { backgroundColor: theme.surface, borderWidth: BORDER, borderColor: theme.line },
  pillLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: theme.accentSoftInk },
  pillLabelActive: { color: theme.ink },
  pillCount: {
    minWidth: 22, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill,
    backgroundColor: theme.accentSoft, alignItems: 'center',
  },
  pillCountLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: theme.accentSoftInk },

  cover: {
    borderRadius: radius.xs, borderWidth: BORDER, borderColor: theme.line,
    alignItems: 'center', justifyContent: 'center', padding: 4,
  },
  coverSmall: { width: 40, height: 56 },
  coverMedium: { width: 56, height: 78 },
  coverLarge: { width: 104, height: 146 },
  coverLabel: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10, textAlign: 'center', lineHeight: 13 },
  coverLabelSmall: { fontSize: 8, lineHeight: 10 },
  coverLabelLarge: { fontSize: 12, lineHeight: 16 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  progressTrack: {
    flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: theme.surface2,
    borderWidth: 1, borderColor: theme.lineSoft, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.ink },
  progressLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.ink2 },

  field: { gap: space[1] },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: theme.ink },
  input: {
    minHeight: 50, borderRadius: radius.s, borderWidth: BORDER, borderColor: theme.line,
    backgroundColor: theme.surface, paddingHorizontal: space[3],
    fontFamily: fonts.body, fontSize: 16, color: theme.ink,
  },
  hint: { fontFamily: fonts.body, fontSize: 13, color: theme.ink2 },

  notice: {
    backgroundColor: theme.dangerSoft, borderRadius: radius.s, borderWidth: BORDER,
    borderColor: theme.danger, padding: space[3],
  },
  noticeInfo: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  noticeText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: theme.danger },
  noticeTextInfo: { color: theme.accentSoftInk },

  loading: { padding: space[6], alignItems: 'center', gap: space[2] },
  loadingLabel: { fontFamily: fonts.body, color: theme.ink2 },

  empty: { paddingVertical: space[6], paddingHorizontal: space[4], alignItems: 'center', gap: space[2] },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: theme.ink, textAlign: 'center' },
  emptyText: { fontFamily: fonts.body, color: theme.ink2, textAlign: 'center', lineHeight: 21 },

  heading: { gap: space[1] },
  headingTitle: { fontFamily: fonts.displayExtra, fontSize: 32, color: theme.ink, letterSpacing: -0.5 },
  headingSubtitle: { fontFamily: fonts.body, fontSize: 15, color: theme.ink2, lineHeight: 21 },
})
