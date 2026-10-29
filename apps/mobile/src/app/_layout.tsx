import { Stack } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fromExpoSqlite } from '../data/expo-db';
import { LedgerProvider } from '../data/LedgerProvider';
import { migrate } from '../data/schema';
import { DraftProvider } from '../features/DraftContext';
import { Loading } from '../ui/components';
import { colors } from '../ui/theme';

export { ErrorBoundary } from 'expo-router';

async function initDb(db: SQLiteDatabase) {
  await migrate(fromExpoSqlite(db));
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Suspense fallback={<Loading label="Ma'lumotlar bazasi ochilmoqda…" />}>
        <SQLiteProvider databaseName="hisobchi.db" onInit={initDb} useSuspense>
          <LedgerProvider>
            <DraftProvider>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: '#fff',
                  headerTitleStyle: { fontWeight: '700' },
                  contentStyle: { backgroundColor: colors.bg },
                  headerBackTitle: 'Orqaga',
                }}
              >
                <Stack.Screen name="index" options={{ title: 'Hisobchi Go' }} />
                <Stack.Screen name="new" options={{ title: 'Yangi hisob' }} />
                <Stack.Screen name="review" options={{ title: 'Tekshirish' }} />
                <Stack.Screen name="confirm" options={{ title: 'Tasdiqlash' }} />
                <Stack.Screen name="sales/index" options={{ title: 'Savdolar tarixi' }} />
                <Stack.Screen name="sales/[id]" options={{ title: 'Savdo tafsiloti' }} />
                <Stack.Screen name="customers/index" options={{ title: 'Mijozlar' }} />
                <Stack.Screen name="customers/[id]" options={{ title: 'Mijoz' }} />
                <Stack.Screen name="customers/form" options={{ title: 'Mijoz', presentation: 'modal' }} />
              </Stack>
            </DraftProvider>
          </LedgerProvider>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
