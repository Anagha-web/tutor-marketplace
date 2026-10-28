import { useCallback, useEffect, useState, type DependencyList } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

interface Settled<T> {
  key: string;
  data: T | undefined;
  error: unknown;
}

/**
 * Runs an async loader whenever `deps` (primitives) change. Results from stale calls are
 * ignored, and the previous data stays available while a new request is loading.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const key = JSON.stringify([...deps, tick]);
  const [settled, setSettled] = useState<Settled<T>>({ key: '', data: undefined, error: null });

  useEffect(() => {
    let cancelled = false;
    loader().then(
      (data) => !cancelled && setSettled({ key, data, error: null }),
      (error: unknown) => !cancelled && setSettled((prev) => ({ key, data: prev.data, error })),
    );
    return () => {
      cancelled = true;
    };
    // The loader closes over `deps`, which are already encoded in `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater: (prev: T | undefined) => T | undefined) => setSettled((prev) => ({ ...prev, data: updater(prev.data) })), []);

  return {
    data: settled.data,
    error: settled.key === key ? settled.error : null,
    loading: settled.key !== key,
    reload,
    setData,
  };
}
