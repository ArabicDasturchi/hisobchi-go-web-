import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, font, radius, space } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button(props: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { variant = 'primary', disabled, loading } = props;
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={props.accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        inactive && styles.buttonDisabled,
        pressed && !inactive && styles.buttonPressed,
        props.style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>
          {props.icon ? `${props.icon}  ` : ''}
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

export function Field(props: TextInputProps & { label: string; error?: string }) {
  const { label, error, style, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Banner({ tone, title, children }: { tone: 'error' | 'warning' | 'success' | 'info'; title?: string; children?: ReactNode }) {
  const palette = {
    error: [colors.dangerSoft, colors.danger],
    warning: [colors.warningBg, colors.warningText],
    success: [colors.successSoft, colors.success],
    info: [colors.blueSoft, colors.blue],
  }[tone];
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: palette[0], borderColor: palette[1] }]}>
      {title ? <Text style={[styles.bannerTitle, { color: palette[1] }]}>{title}</Text> : null}
      {typeof children === 'string' ? <Text style={[styles.bannerText, { color: palette[1] }]}>{children}</Text> : children}
    </View>
  );
}

export function Loading({ label = 'Yuklanmoqda…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={[styles.muted, { textAlign: 'center' }]}>{text}</Text> : null}
      {action}
    </View>
  );
}

export function ListRow(props: { title: string; subtitle?: string; right?: string; onPress?: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      accessibilityRole={props.onPress ? 'button' : undefined}
      accessibilityLabel={props.accessibilityLabel ?? `${props.title}${props.right ? `, ${props.right}` : ''}`}
      onPress={props.onPress}
      disabled={!props.onPress}
      style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: colors.bg }]}
    >
      <View style={{ flex: 1, paddingRight: space.sm }}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {props.title}
        </Text>
        {props.subtitle ? (
          <Text style={styles.muted} numberOfLines={1}>
            {props.subtitle}
          </Text>
        ) : null}
      </View>
      {props.right ? <Text style={styles.listRight}>{props.right}</Text> : null}
      {props.onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.card, borderColor: colors.primary },
  button_danger: { backgroundColor: colors.danger },
  button_ghost: { backgroundColor: 'transparent' },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: font.lg, fontWeight: '700' },
  buttonText_primary: { color: '#fff' },
  buttonText_secondary: { color: colors.primary },
  buttonText_danger: { color: '#fff' },
  buttonText_ghost: { color: colors.blue },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text, marginBottom: space.sm },
  field: { marginBottom: space.md },
  fieldLabel: { fontSize: font.sm, fontWeight: '600', color: colors.textMuted, marginBottom: space.xs },
  fieldError: { fontSize: font.sm, color: colors.danger, marginTop: space.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    fontSize: font.md,
    color: colors.text,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: colors.danger },
  banner: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.xs },
  bannerTitle: { fontWeight: '700', fontSize: font.md },
  bannerText: { fontSize: font.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  muted: { color: colors.textMuted, fontSize: font.sm },
  empty: { alignItems: 'center', padding: space.xl, gap: space.sm },
  emptyTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  listTitle: { fontSize: font.md, fontWeight: '600', color: colors.text },
  listRight: { fontSize: font.md, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  chevron: { fontSize: 24, color: colors.textMuted, marginLeft: space.sm },
});
