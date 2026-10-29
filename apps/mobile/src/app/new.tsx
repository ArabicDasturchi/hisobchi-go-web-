import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDraft } from '../features/DraftContext';
import { useVoiceInput } from '../features/useVoiceInput';
import { Banner, Button, Card } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

const EXAMPLE = "3 ta non 4000 so'mdan\n2 litr sut 12000 so'mdan\n5 kg shakar 15000 so'mdan";

export default function NewCalculationScreen() {
  const { draft, startFromText } = useDraft();
  const [text, setText] = useState(draft?.rawInput ?? '');
  const [error, setError] = useState<string | null>(null);
  const voice = useVoiceInput((spoken) => setText((t) => (t.trim() ? `${t.trimEnd()}\n${spoken}` : spoken)));

  const submit = () => {
    if (!text.trim()) {
      setError("Ro'yxat bo'sh. Mahsulot, miqdor va narxni yozing.");
      return;
    }
    const count = startFromText(text);
    if (count === 0) {
      setError("Matndan birorta ham qator ajratilmadi. Har bir mahsulotni yangi qatorga yozing.");
      return;
    }
    setError(null);
    router.push('/review');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.help}>
          Har bir mahsulotni alohida qatorga yoki vergul bilan yozing: miqdor, birlik, nom va narx.
        </Text>

        <TextInput
          accessibilityLabel="Mahsulot ro'yxati"
          multiline
          value={text}
          onChangeText={(t) => {
            setText(t);
            if (error) setError(null);
          }}
          placeholder={EXAMPLE}
          placeholderTextColor={colors.textMuted}
          style={s.input}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {voice.listening ? (
          <Banner tone="info" title="Tinglanmoqda…">
            {voice.partial || "Ro'yxatni ayting"}
          </Banner>
        ) : null}
        {voice.error ? <Banner tone="warning">{voice.error}</Banner> : null}
        {error ? <Banner tone="error">{error}</Banner> : null}

        <View style={s.row}>
          {voice.supported ? (
            <Button
              label={voice.listening ? "To'xtatish" : 'Ovoz bilan'}
              icon="🎤"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={voice.listening ? voice.stop : voice.start}
            />
          ) : null}
          <Button
            label="Tozalash"
            variant="secondary"
            style={{ flex: 1 }}
            disabled={!text}
            onPress={() => {
              setText('');
              setError(null);
            }}
          />
        </View>

        {!voice.supported ? (
          <Card style={{ backgroundColor: colors.blueSoft, borderColor: colors.blueSoft }}>
            <Text style={s.note}>
              Ilova ichidagi ovozli kiritish bu build'da mavjud emas (Expo Go'da ishlamaydi — development build kerak).
              Klaviaturadagi mikrofon tugmasi orqali aytib yozishingiz mumkin.
            </Text>
          </Card>
        ) : null}

        <Button label="Tahlil qilish" onPress={submit} disabled={voice.listening} />

        <Button label="Namunani qo'yish" variant="ghost" onPress={() => setText(EXAMPLE)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  help: { fontSize: font.md, color: colors.textMuted },
  input: {
    minHeight: 200,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    fontSize: font.lg,
    lineHeight: 26,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: space.md },
  note: { color: colors.blue, fontSize: font.sm },
});
