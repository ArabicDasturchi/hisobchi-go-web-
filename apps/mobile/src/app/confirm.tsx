import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalculationMismatchError, type CustomerWithBalance, type TotalsCheck } from '../data/ledger';
import { useLedger } from '../data/LedgerProvider';
import { useDraft } from '../features/DraftContext';
import { toSaleLines } from '../features/draft';
import { useFocusData } from '../features/useAsync';
import { formatQty, formatSom, UNIT_LABELS } from '../lib/format';
import { Banner, Button, Card, EmptyState, Field, Loading, SectionTitle } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

export default function ConfirmScreen() {
  const ledger = useLedger();
  const { draft, clear } = useDraft();
  const params = useLocalSearchParams<{ customerId?: string }>();

  const lines = useMemo(() => {
    try {
      return draft ? toSaleLines(draft.rows) : null;
    } catch {
      return null;
    }
  }, [draft]);

  const [check, setCheck] = useState<TotalsCheck | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(params.customerId ?? null);
  const [search, setSearch] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (params.customerId) setCustomerId(params.customerId);
  }, [params.customerId]);

  useEffect(() => {
    if (!lines) return;
    setCheck(null);
    ledger
      .verifyTotals(lines)
      .then(setCheck)
      .catch((e: unknown) => setCheckError(e instanceof Error ? e.message : String(e)));
  }, [ledger, lines]);

  const customers = useFocusData(() => ledger.listCustomers(search), [ledger, search]);

  if (!draft || !lines) {
    return (
      <EmptyState
        title="Tasdiqlash uchun tayyor ro'yxat yo'q"
        text="Ro'yxatni kiriting va barcha sariq qatorlarni hal qiling."
        action={<Button label="Tekshirishga qaytish" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      />
    );
  }

  const selected = customers.data?.find((c) => c.id === customerId);
  const canSave = !!check?.match && confirmed && !saving;

  const save = async () => {
    if (savingRef.current || !check?.match || !confirmed) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await ledger.postSale({
        clientOpId: draft.clientOpId,
        customerId,
        rawInput: draft.rawInput,
        lines,
      });
      clear();
      router.dismissTo('/');
      router.push(`/sales/${res.saleId}`);
    } catch (e) {
      setSaveError(
        e instanceof CalculationMismatchError
          ? e.message
          : `Savdo saqlanmadi: ${e instanceof Error ? e.message : String(e)}`,
      );
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Card>
        <SectionTitle>Mahsulotlar</SectionTitle>
        {lines.map((l, i) => (
          <View key={i} style={s.line}>
            <View style={{ flex: 1 }}>
              <Text style={s.lineName}>{l.productName}</Text>
              <Text style={s.lineMeta}>
                {formatQty(l.qtyMilli)} {UNIT_LABELS[l.unit]} × {formatSom(l.unitPrice)}
              </Text>
            </View>
            <Text style={s.lineTotal}>{check ? formatSom(check.tsLineTotals[i]) : '…'}</Text>
          </View>
        ))}
      </Card>

      {checkError ? (
        <Banner tone="error" title="Tekshiruvda xato">
          {checkError}
        </Banner>
      ) : !check ? (
        <Loading label="Ikki mustaqil hisob bajarilmoqda…" />
      ) : check.match ? (
        <View style={s.totalBox} accessible accessibilityLabel={`Jami ${formatSom(check.tsTotal)}. Ikki hisob mos keldi.`}>
          <Text style={s.totalLabel}>Jami</Text>
          <Text style={s.totalValue}>{formatSom(check.tsTotal)}</Text>
          <Text style={s.verified}>✓ TypeScript (BigInt) va SQLite hisoblari mos keldi</Text>
        </View>
      ) : (
        <Banner tone="error" title="Hisob-kitoblar mos kelmadi — saqlash bloklandi">
          {`TypeScript: ${formatSom(check.tsTotal)}\nSQLite: ${formatSom(check.sqlTotal)}\nRo'yxatni qayta tekshiring.`}
        </Banner>
      )}

      <Card>
        <SectionTitle>Mijoz</SectionTitle>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: customerId === null }}
          onPress={() => setCustomerId(null)}
          style={[s.option, customerId === null && s.optionSelected]}
        >
          <Text style={s.optionText}>Umumiy xaridor (mijozsiz)</Text>
        </Pressable>
        {selected ? (
          <View style={[s.option, s.optionSelected]}>
            <Text style={s.optionText}>✓ {selected.name}</Text>
          </View>
        ) : null}
        <Field label="Mijoz qidirish" value={search} onChangeText={setSearch} placeholder="Ism yoki telefon" />
        {customers.data?.slice(0, 6).map((c: CustomerWithBalance) =>
          c.id === customerId ? null : (
            <Pressable
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: false }}
              onPress={() => setCustomerId(c.id)}
              style={s.option}
            >
              <Text style={s.optionText}>{c.name}</Text>
              {c.phone ? <Text style={s.lineMeta}>{c.phone}</Text> : null}
            </Pressable>
          ),
        )}
        {customers.data && customers.data.length === 0 ? <Text style={s.lineMeta}>Mijoz topilmadi.</Text> : null}
        <Button
          label="Yangi mijoz qo'shish"
          variant="ghost"
          onPress={() => router.push({ pathname: '/customers/form', params: { returnTo: 'confirm' } })}
        />
      </Card>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
        onPress={() => setConfirmed((v) => !v)}
        style={s.checkRow}
      >
        <View style={[s.checkbox, confirmed && s.checkboxOn]}>{confirmed ? <Text style={s.checkMark}>✓</Text> : null}</View>
        <Text style={s.checkText}>Ro'yxatni tekshirdim, mahsulotlar va narxlar to'g'ri. Savdoni saqlashni tasdiqlayman.</Text>
      </Pressable>

      {saveError ? <Banner tone="error">{saveError}</Banner> : null}

      <Button label="Savdoni saqlash" onPress={save} disabled={!canSave} loading={saving} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lineName: { fontSize: font.md, fontWeight: '600', color: colors.text },
  lineMeta: { fontSize: font.sm, color: colors.textMuted },
  lineTotal: { fontSize: font.md, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  totalBox: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.xs },
  totalLabel: { color: '#D4F0E6', fontSize: font.md, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: font.xxl + 4, fontWeight: '800', fontVariant: ['tabular-nums'] },
  verified: { color: '#D4F0E6', fontSize: font.sm, textAlign: 'center' },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.sm,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 2 },
  optionText: { fontSize: font.md, color: colors.text, fontWeight: '600' },
  checkRow: { flexDirection: 'row', gap: space.md, alignItems: 'center', minHeight: 48 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxOn: { backgroundColor: colors.primary },
  checkMark: { color: '#fff', fontWeight: '800' },
  checkText: { flex: 1, fontSize: font.md, color: colors.text },
});
