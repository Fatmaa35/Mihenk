import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native'
import { theme } from './theme'

export function Button({ label, onPress, loading, variant = 'primary', disabled }: {
  label: string
  onPress: () => void
  loading?: boolean
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.button, styles[variant],
        pressed && !inactive ? styles.pressed : null,
        inactive ? styles.inactive : null,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.accent} />
        : <Text style={[styles.buttonLabel, variant !== 'primary' && styles.buttonLabelDark]}>{label}</Text>}
    </Pressable>
  )
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={theme.ink2}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  )
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
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

const styles = StyleSheet.create({
  button: {
    minHeight: 48, borderRadius: theme.radius, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: { backgroundColor: theme.accent },
  ghost: { backgroundColor: theme.surfaceMuted },
  danger: { backgroundColor: theme.accentSoft, borderWidth: 1, borderColor: theme.danger },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.6 },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonLabelDark: { color: theme.ink },
  field: { gap: 6 },
  fieldLabel: { color: theme.ink2, fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: 48, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.surface, paddingHorizontal: 14, fontSize: 16, color: theme.ink,
  },
  card: {
    backgroundColor: theme.surface, borderRadius: theme.radius, borderWidth: 1,
    borderColor: theme.border, padding: 14, gap: 8,
  },
  notice: { backgroundColor: '#f7e4e1', borderRadius: theme.radius, padding: 12 },
  noticeInfo: { backgroundColor: theme.accentSoft },
  noticeText: { color: theme.danger, fontSize: 14 },
  noticeTextInfo: { color: theme.ink },
  loading: { padding: 24, alignItems: 'center', gap: 8 },
  loadingLabel: { color: theme.ink2 },
  empty: { padding: 24, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.ink, textAlign: 'center' },
  emptyText: { color: theme.ink2, textAlign: 'center', lineHeight: 20 },
})
