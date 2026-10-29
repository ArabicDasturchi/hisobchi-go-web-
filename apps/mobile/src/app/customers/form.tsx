import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLedger } from '../../data/LedgerProvider';
import { Banner, Button, Field, Loading } from '../../ui/components';
import { space } from '../../ui/theme';

/** Mijoz yaratish (id yo'q) yoki tahrirlash (id bor) */
export default function CustomerFormScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const ledger = useLedger();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (!id) return;
    ledger
      .getCustomer(id)
      .then((c) => {
        if (c) {
          setName(c.name);
          setPhone(c.phone ?? '');
          setNote(c.note ?? '');
        } else {
          setError('Mijoz topilmadi');
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id, ledger]);

  const save = async () => {
    if (!name.trim()) {
      setNameError('Ism kiritilishi shart');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (id) {
        await ledger.updateCustomer(id, { name, phone, note });
        router.back();
      } else {
        const newId = await ledger.createCustomer({ name, phone, note });
        if (returnTo === 'confirm') {
          router.dismissTo({ pathname: '/confirm', params: { customerId: newId } });
        } else {
          router.replace(`/customers/${newId}`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Mijozni tahrirlash' : 'Yangi mijoz' }} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm }} keyboardShouldPersistTaps="handled">
        <Field
          label="Ism *"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameError(undefined);
          }}
          placeholder="masalan: Akmal aka"
          error={nameError}
          autoFocus={!id}
        />
        <Field label="Telefon" value={phone} onChangeText={setPhone} placeholder="+998 90 123 45 67" keyboardType="phone-pad" />
        <Field label="Izoh" value={note} onChangeText={setNote} placeholder="masalan: Chorsu bozori, 12-do'kon" />
        {error ? <Banner tone="error">{error}</Banner> : null}
        <Button label="Saqlash" onPress={save} loading={saving} />
        <Button label="Bekor qilish" variant="ghost" onPress={() => router.back()} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
