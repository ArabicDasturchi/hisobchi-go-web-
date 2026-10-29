import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLedger } from '../../data/LedgerProvider';
import { useFocusData } from '../../features/useAsync';
import { formatDateTime, formatSom } from '../../lib/format';
import { Banner, Button, Card, EmptyState, ListRow, Loading, SectionTitle } from '../../ui/components';
import { colors, font, space } from '../../ui/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ledger = useLedger();
  const { data, error, loading } = useFocusData(
    async () => ({ customer: await ledger.getCustomer(id), sales: await ledger.listSales({ customerId: id }) }),
    [ledger, id],
  );

  if (loading && !data) return <Loading />;
  if (error) return <Banner tone="error" title="Mijoz yuklanmadi">{error}</Banner>;
  if (!data?.customer) return <EmptyState title="Mijoz topilmadi" />;
  const { customer, sales } = data;

  return (
    <>
      <Stack.Screen options={{ title: customer.name }} />
      <FlatList
        data={sales}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <View style={{ padding: space.lg, gap: space.md }}>
            <Card>
              <Text style={s.name}>{customer.name}</Text>
              {customer.phone ? <Text style={s.meta}>📞 {customer.phone}</Text> : null}
              {customer.note ? <Text style={s.meta}>{customer.note}</Text> : null}
              <View style={s.balanceRow}>
                <Text style={s.meta}>Jami savdolar ({customer.saleCount} ta)</Text>
                <Text style={s.balance}>{formatSom(customer.balance)}</Text>
              </View>
            </Card>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button
                label="Tahrirlash"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/customers/form', params: { id: customer.id } })}
              />
              <Button label="Yangi hisob" style={{ flex: 1 }} onPress={() => router.push('/new')} />
            </View>
            <SectionTitle>Savdolar tarixi</SectionTitle>
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            title={formatDateTime(item.createdAt)}
            subtitle={`${item.lineCount} ta mahsulot`}
            right={formatSom(item.total)}
            onPress={() => router.push(`/sales/${item.id}`)}
          />
        )}
        ListEmptyComponent={<EmptyState title="Bu mijozga hali savdo biriktirilmagan" />}
      />
    </>
  );
}

const s = StyleSheet.create({
  name: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  meta: { fontSize: font.md, color: colors.textMuted, marginTop: space.xs },
  balanceRow: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balance: { fontSize: font.xl, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
});
