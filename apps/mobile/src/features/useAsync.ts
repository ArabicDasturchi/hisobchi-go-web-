import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/** Ekran fokusga kelganda ma'lumotni qayta yuklaydi (loading / error holatlari bilan) */
export function useFocusData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loader = useCallback(load, deps);

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    loader()
      .then((d) => {
        if (active) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loader]);

  useFocusEffect(reload);
  return { data, error, loading, reload };
}
