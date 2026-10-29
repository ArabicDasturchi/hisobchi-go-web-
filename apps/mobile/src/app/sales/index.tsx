import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useLedger } from '../../data/LedgerProvider';
import { useFocusData } from '../../features/useAsync';
import { formatDateTime, formatSom } from '../../lib/format';
import { Banner, Button, EmptyState, ListRow, Loading } from '../../ui/components';
import { space } from '../../ui/theme';

export default function SalesHistoryScreen() {
  const ledger = useLedger();
  const { data, error, loading, reload } = useFocusData(() => ledger.listSales({ limit: 500 }), [ledger]);

  if (loading && !data) return <Loading />;
  if (error) {
    return (
      <View style={{ padding: space.lg, gap: space.md }}>
        <Banner tone="error" title="Tarix yuklanmadi">
          {error}
        </Banner>
        <Button label="Qayta urinish" variant="secondary" onPress={reload} />
      </View>
    );
  }

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <ListRow
          title={item.customerName ?? 'Umumiy xaridor'}
          subtitle={`${formatDateTime(item.createdAt)} · ${item.lineCount} ta mahsulot`}
          right={formatSom(item.total)}
          onPress={() => router.push(`/sales/${item.id}`)}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          title="Saqlangan savdolar yo'q"
          text="Tasdiqlangan savdolar shu yerda ko'rinadi."
          action={<Button label="Yangi hisob" onPress={() => router.push('/new')} />}
        />
      }
    />
  );
}
