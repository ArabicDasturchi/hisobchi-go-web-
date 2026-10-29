import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLedger } from '../../data/LedgerProvider';
import { useFocusData } from '../../features/useAsync';
import { formatSom } from '../../lib/format';
import { Banner, Button, EmptyState, Field, ListRow, Loading } from '../../ui/components';
import { space } from '../../ui/theme';

export default function CustomersScreen() {
  const ledger = useLedger();
  const [search, setSearch] = useState('');
  const { data, error, loading } = useFocusData(() => ledger.listCustomers(search), [ledger, search]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: space.lg, paddingBottom: 0, gap: space.sm }}>
        <Button label="Yangi mijoz" icon="＋" onPress={() => router.push('/customers/form')} />
        <Field label="Qidirish" value={search} onChangeText={setSearch} placeholder="Ism yoki telefon" />
        {error ? <Banner tone="error">{error}</Banner> : null}
      </View>
      {loading && !data ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              subtitle={`${item.phone ? `${item.phone} · ` : ''}${item.saleCount} ta savdo`}
              right={formatSom(item.balance)}
              onPress={() => router.push(`/customers/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={search ? 'Mijoz topilmadi' : "Mijozlar yo'q"}
              text={search ? undefined : "Mijoz qo'shing va savdolarni unga biriktiring."}
            />
          }
        />
      )}
    </View>
  );
}
