/**
 * Ovozli kiritish (expo-speech-recognition).
 *
 * Native modul faqat development/production build'da bor — Expo Go'da yo'q.
 * Modul topilmasa yoki qurilma nutqni aniqlay olmasa, `supported=false`
 * qaytariladi va ekran matn kiritishni taklif qiladi. Natija soxtalashtirilmaydi.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule as ModuleType } from 'expo-speech-recognition';

type SpeechModule = typeof ModuleType;

function loadSpeechModule(): SpeechModule | null {
  if (!requireOptionalNativeModule('ExpoSpeechRecognition')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('expo-speech-recognition') as { ExpoSpeechRecognitionModule: SpeechModule })
      .ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Mikrofon yoki nutqni aniqlashga ruxsat berilmadi. Sozlamalardan ruxsat bering.',
  'language-not-supported': "Qurilmada o'zbek tili nutqni aniqlash uchun o'rnatilmagan.",
  'service-not-allowed': 'Qurilmada nutqni aniqlash xizmati mavjud emas.',
  network: "Nutqni aniqlash uchun internet aloqasi kerak.",
  'no-speech': "Ovoz eshitilmadi. Qaytadan urinib ko'ring.",
  'speech-timeout': "Ovoz eshitilmadi. Qaytadan urinib ko'ring.",
  'audio-capture': 'Mikrofondan ovoz olinmadi.',
  busy: "Nutqni aniqlash xizmati band. Birozdan keyin urinib ko'ring.",
};

export function useVoiceInput(onFinalText: (text: string) => void) {
  const moduleRef = useRef<SpeechModule | null | undefined>(undefined);
  if (moduleRef.current === undefined) moduleRef.current = loadSpeechModule();
  const mod = moduleRef.current;

  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onFinalRef = useRef(onFinalText);
  onFinalRef.current = onFinalText;

  useEffect(() => {
    if (!mod) return;
    const subs = [
      mod.addListener('result', (e) => {
        const text = e.results[0]?.transcript ?? '';
        if (e.isFinal) {
          setPartial('');
          if (text.trim()) onFinalRef.current(text.trim());
        } else {
          setPartial(text);
        }
      }),
      mod.addListener('error', (e) => {
        if (e.error !== 'aborted') setError(ERROR_MESSAGES[e.error] ?? `Ovozni aniqlashda xato: ${e.message}`);
        setListening(false);
      }),
      mod.addListener('end', () => {
        setListening(false);
        setPartial('');
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      mod.abort();
    };
  }, [mod]);

  const start = useCallback(async () => {
    if (!mod) return;
    setError(null);
    const perm = await mod.requestPermissionsAsync();
    if (!perm.granted) {
      setError(ERROR_MESSAGES['not-allowed']);
      return;
    }
    if (!mod.isRecognitionAvailable()) {
      setError(ERROR_MESSAGES['service-not-allowed']);
      return;
    }
    setListening(true);
    mod.start({ lang: 'uz-UZ', interimResults: true, continuous: false, addsPunctuation: false });
  }, [mod]);

  const stop = useCallback(() => mod?.stop(), [mod]);

  return { supported: mod !== null, listening, partial, error, start, stop };
}
