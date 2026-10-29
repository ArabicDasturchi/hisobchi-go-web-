import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLedger } from '../../data/LedgerProvider';
import { useFocusData } from '../../features/useAsync';
import { formatDateTime, formatQty, formatSom, UNIT_LABELS } from '../../lib/format';
import { Banner, Button, Card, EmptyState, Loading, SectionTitle } from '../../ui/components';
import { colors, font, radius, space } from '../../ui/theme';

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ledger = useLedger();
  const { data: sale, error, loading } = useFocusData(() => ledger.getSale(id), [ledger, id]);

  if (loading && !sale) return <Loading />;
  if (error) return <Banner tone="error" title="Savdo yuklanmadi">{error}</Banner>;
  if (!sale) return <EmptyState title="Savdo topilmadi" />;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.totalBox}>
        <Text style={s.totalLabel}>Jami</Text>
        <Text style={s.totalValue}>{formatSom(sale.total)}</Text>
        <Text style={s.meta}>{formatDateTime(sale.createdAt)}</Text>
      </View>

      <Banner tone="success" title="Saqlangan savdo">
        {`Ikki mustaqil hisob mos kelgan: TypeScript ${formatSom(sale.tsTotal)}, SQLite ${formatSom(sale.sqlTotal)}. Yozuv o'zgartirilmaydi va o'chirilmaydi.`}
      </Banner>

      <Card>
        <SectionTitle>Mijoz</SectionTitle>
        {sale.customerId ? (
          <Button
            label={sale.customerName ?? 'Mijoz'}
            variant="secondary"
            onPress={() => router.push(`/customers/${sale.customerId}`)}
          />
        ) : (
          <Text style={s.text}>Umumiy xaridor</Text>
        )}
      </Card>

      <Card>
        <SectionTitle>Mahsulotlar ({sale.lines.length})</SectionTitle>
        {sale.lines.map((l) => (
          <View key={l.lineIndex} style={s.line}>
            <View style={{ flex: 1 }}>
              <Text style={s.lineName}>{l.productName}</Text>
              <Text style={s.lineMeta}>
                {formatQty(l.qtyMilli)} {UNIT_LABELS[l.unit] ?? l.unit} × {formatSom(l.unitPrice)}
              </Text>
              {l.rawText ? <Text style={s.raw}>«{l.rawText}»</Text> : null}
            </View>
            <Text style={s.lineTotal}>{formatSom(l.lineTotal)}</Text>
          </View>
        ))}
      </Card>

      {sale.rawInput ? (
        <Card>
          <SectionTitle>Kiritilgan asl matn</SectionTitle>
          <Text style={s.text} selectable>
            {sale.rawInput}
          </Text>
        </Card>
      ) : null}

      <Text style={s.opId} selectable>
        Savdo ID: {sale.id}
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg },
  totalBox: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.xs },
  totalLabel: { color: '#D4F0E6', fontSize: font.md, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: font.xxl, fontWeight: '800', fontVariant: ['tabular-nums'] },
  meta: { color: '#D4F0E6', fontSize: font.sm },
  text: { fontSize: font.md, color: colors.text },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: space.sm,
  },
  lineName: { fontSize: font.md, fontWeight: '600', color: colors.text },
  lineMeta: { fontSize: font.sm, color: colors.textMuted },
  raw: { fontSize: font.sm, color: colors.textMuted, fontStyle: 'italic' },
  lineTotal: { fontSize: font.md, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  opId: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
