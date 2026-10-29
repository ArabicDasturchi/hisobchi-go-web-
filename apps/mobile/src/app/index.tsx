import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLedger } from '../data/LedgerProvider';
import { useFocusData } from '../features/useAsync';
import { formatDateTime, formatSom, startOfTodayIso } from '../lib/format';
import { Banner, Button, Card, EmptyState, ListRow, Loading, SectionTitle } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

export default function HomeScreen() {
  const ledger = useLedger();
  const { data, error, loading } = useFocusData(
    async () => ({
      today: await ledger.totalSince(startOfTodayIso()),
      recent: await ledger.listSales({ limit: 5 }),
    }),
    [ledger],
  );

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.hero}>
        <Text style={s.brand}>Hisobchi Go</Text>
        <Text style={s.tagline}>Ro'yxatni yozing — hisobni ishonchli qilamiz</Text>
        <View style={s.todayBox} accessible accessibilityLabel={`Bugungi savdo ${data ? formatSom(data.today.total) : ''}`}>
          <Text style={s.todayLabel}>Bugungi savdo</Text>
          <Text style={s.todayValue}>{data ? formatSom(data.today.total) : '—'}</Text>
          <Text style={s.todayCount}>{data ? `${data.today.count} ta savdo` : ' '}</Text>
        </View>
      </View>

      <Button label="Yangi hisob" icon="＋" onPress={() => router.push('/new')} accessibilityHint="Mahsulot ro'yxatini kiritish" />

      <View style={s.row}>
        <Button
          label="Mijozlar"
          variant="secondary"
          style={s.half}
          onPress={() => router.push('/customers')}
        />
        <Button
          label="Tarix"
          variant="secondary"
          style={s.half}
          onPress={() => router.push('/sales')}
        />
      </View>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: space.lg, paddingBottom: space.sm }}>
          <SectionTitle>So'nggi savdolar</SectionTitle>
        </View>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <View style={{ padding: space.lg }}>
            <Banner tone="error" title="Ma'lumot yuklanmadi">
              {error}
            </Banner>
          </View>
        ) : data && data.recent.length === 0 ? (
          <EmptyState title="Hali savdo yo'q" text="Birinchi hisobni boshlash uchun «Yangi hisob» tugmasini bosing." />
        ) : (
          data?.recent.map((sale) => (
            <ListRow
              key={sale.id}
              title={sale.customerName ?? 'Umumiy xaridor'}
              subtitle={`${formatDateTime(sale.createdAt)} · ${sale.lineCount} ta mahsulot`}
              right={formatSom(sale.total)}
              onPress={() => router.push(`/sales/${sale.id}`)}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg },
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.xl, gap: space.xs },
  brand: { color: '#fff', fontSize: font.xxl, fontWeight: '800' },
  tagline: { color: '#D4F0E6', fontSize: font.md },
  todayBox: { marginTop: space.lg, backgroundColor: colors.primaryDark, borderRadius: radius.md, padding: space.lg },
  todayLabel: { color: '#BFE6D8', fontSize: font.sm, fontWeight: '600' },
  todayValue: { color: '#fff', fontSize: font.xl + 4, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: space.xs },
  todayCount: { color: '#BFE6D8', fontSize: font.sm },
  row: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
});
