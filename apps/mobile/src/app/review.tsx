import { ALLOWED_UNITS } from '@hisobchi/core';
import { router } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDraft } from '../features/DraftContext';
import { summarizeDraft, type DraftRow, type RowEval } from '../features/draft';
import { formatSom, UNIT_LABELS } from '../lib/format';
import { Banner, Button, EmptyState, Field } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

export default function ReviewScreen() {
  const { draft, updateRow, acknowledgeRow, removeRow, addRow } = useDraft();

  if (!draft) {
    return (
      <EmptyState
        title="Qoralama yo'q"
        text="Avval mahsulot ro'yxatini kiriting."
        action={<Button label="Ro'yxat kiritish" onPress={() => router.replace('/new')} />}
      />
    );
  }

  const summary = summarizeDraft(draft.rows);
  const confirmRemove = (row: DraftRow) =>
    Alert.alert("Qatorni o'chirish", `"${row.productName || 'nomsiz qator'}" o'chirilsinmi?`, [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: "O'chirish", style: 'destructive', onPress: () => removeRow(row.key) },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {summary.errorRows + summary.warningRows > 0 ? (
          <Banner tone="warning" title="Sariq qatorlarni tekshiring">
            {`${summary.errorRows} ta qatorda xato, ${summary.warningRows} ta qatorda noaniqlik bor. Hammasi hal qilinmaguncha tasdiqlab bo'lmaydi.`}
          </Banner>
        ) : draft.rows.length > 0 ? (
          <Banner tone="success">Barcha qatorlar to'g'ri. Tasdiqlashga o'tishingiz mumkin.</Banner>
        ) : null}

        {draft.rows.map((row, i) => (
          <RowEditor
            key={row.key}
            index={i}
            row={row}
            ev={summary.evals[i]}
            onChange={(patch) => updateRow(row.key, patch)}
            onAcknowledge={() => acknowledgeRow(row.key)}
            onRemove={() => confirmRemove(row)}
          />
        ))}

        {draft.rows.length === 0 ? <EmptyState title="Qatorlar yo'q" text="Yangi qator qo'shing." /> : null}

        <Button label="Qator qo'shish" icon="＋" variant="secondary" onPress={addRow} />
      </ScrollView>

      <View style={s.footer}>
        <View style={s.footerRow}>
          <Text style={s.footerLabel}>Taxminiy jami</Text>
          <Text style={s.footerValue}>{formatSom(summary.previewTotal)}</Text>
        </View>
        <Button
          label="Tasdiqlashga o'tish"
          disabled={!summary.canConfirm}
          accessibilityHint={summary.canConfirm ? undefined : "Avval sariq qatorlarni hal qiling"}
          onPress={() => router.push('/confirm')}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function RowEditor(props: {
  index: number;
  row: DraftRow;
  ev: RowEval;
  onChange: (patch: Partial<Pick<DraftRow, 'productName' | 'qtyText' | 'unit' | 'priceText'>>) => void;
  onAcknowledge: () => void;
  onRemove: () => void;
}) {
  const { row, ev } = props;
  const flagged = ev.status !== 'ok';
  const fieldError = (field: string) => ev.errors.find((e) => e.field === field)?.message;

  return (
    <View
      style={[s.row, flagged && s.rowFlagged]}
      accessibilityLabel={`${props.index + 1}-qator${flagged ? ', tekshirish kerak' : ''}`}
    >
      <View style={s.rowHeader}>
        <Text style={s.rowIndex}>{props.index + 1}</Text>
        {row.source === 'parsed' ? (
          <Text style={s.raw} numberOfLines={2}>
            Asl matn: «{row.rawText}»
          </Text>
        ) : (
          <Text style={s.raw}>Qo'lda qo'shilgan</Text>
        )}
      </View>

      <Field
        label="Mahsulot"
        value={row.productName}
        onChangeText={(v) => props.onChange({ productName: v })}
        placeholder="masalan: non"
        error={fieldError('productName')}
      />
      <View style={s.twoCol}>
        <View style={{ flex: 1 }}>
          <Field
            label="Miqdor"
            value={row.qtyText}
            onChangeText={(v) => props.onChange({ qtyText: v })}
            keyboardType="decimal-pad"
            placeholder="3 yoki 1,5"
            error={fieldError('qtyMilli')}
          />
        </View>
        <View style={{ flex: 1.3 }}>
          <Field
            label="Narx (so'm)"
            value={row.priceText}
            onChangeText={(v) => props.onChange({ priceText: v })}
            placeholder="4000 yoki 13 ming"
            error={fieldError('unitPrice')}
          />
        </View>
      </View>

      <Text style={s.label}>Birlik</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {ALLOWED_UNITS.map((u) => {
          const selected = row.unit === u;
          return (
            <Pressable
              key={u}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Birlik: ${UNIT_LABELS[u]}`}
              onPress={() => props.onChange({ unit: u })}
              style={[s.chip, selected && s.chipSelected]}
            >
              <Text style={[s.chipText, selected && s.chipTextSelected]}>{UNIT_LABELS[u]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {fieldError('unit') ? <Text style={s.error}>{fieldError('unit')}</Text> : null}

      {ev.errors
        .filter((e) => !e.field || !['productName', 'qtyMilli', 'unitPrice', 'unit'].includes(e.field))
        .map((e, i) => (
          <Text key={`e${i}`} style={s.error}>
            ⛔ {e.message}
          </Text>
        ))}
      {ev.warnings.map((w, i) => (
        <Text key={`w${i}`} style={s.warning}>
          ⚠ {w.message}
        </Text>
      ))}

      <View style={s.rowFooter}>
        <Text style={s.lineTotal}>{ev.lineTotal !== undefined ? formatSom(ev.lineTotal) : '— so\'m'}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {ev.status === 'warning' ? (
            <Button label="To'g'ri" style={s.smallBtn} onPress={props.onAcknowledge} accessibilityHint="Ogohlantirishni ko'rib chiqdim" />
          ) : null}
          <Button label="O'chirish" variant="ghost" style={s.smallBtn} onPress={props.onRemove} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  row: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  rowFlagged: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder, borderWidth: 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  rowIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
    overflow: 'hidden',
  },
  raw: { flex: 1, color: colors.textMuted, fontSize: font.sm, fontStyle: 'italic' },
  twoCol: { flexDirection: 'row', gap: space.md },
  label: { fontSize: font.sm, fontWeight: '600', color: colors.textMuted, marginBottom: space.xs },
  chips: { gap: space.sm, paddingBottom: space.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontSize: font.md },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  error: { color: colors.danger, fontSize: font.sm, marginTop: space.xs },
  warning: { color: colors.warningText, fontSize: font.sm, marginTop: space.xs, fontWeight: '600' },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  lineTotal: { fontSize: font.lg, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  smallBtn: { minHeight: 44, paddingHorizontal: space.md },
  footer: {
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  footerLabel: { color: colors.textMuted, fontSize: font.md },
  footerValue: { fontSize: font.xl, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
});
