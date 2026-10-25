import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../components/ui.jsx';

/*
 * The database is the single source of truth. Every screen asks the API for what it
 * shows. After any write, `version` changes and every active query fetches again,
 * so a change made in one role appears in the others straight away.
 */
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [version, setVersion] = useState(0);
  const toast = useToast();

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  /** Run a write. Shows the server's message on failure, refreshes everything on success. */
  const act = useCallback(
    async (work, successMessage) => {
      try {
        const result = await work();
        refresh();
        if (successMessage) toast(typeof successMessage === 'function' ? successMessage(result) : successMessage);
        return true;
      } catch (error) {
        toast(error.message, 'error');
        return false;
      }
    },
    [refresh, toast],
  );

  const value = useMemo(() => ({ version, refresh, act }), [version, refresh, act]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside DataProvider');
  return context;
};

/** GET `path` (skip with a falsy path). Keeps the last result visible while refetching. */
export function useQuery(path) {
  const { version } = useData();
  const [state, setState] = useState({ path: null, data: null, error: null });
  const [loadedVersion, setLoadedVersion] = useState(-1);

  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    api
      .get(path)
      .then((data) => {
        if (cancelled) return;
        setState({ path, data, error: null });
        setLoadedVersion(version);
      })
      .catch((error) => {
        if (cancelled) return;
        setState((s) => ({ ...s, path, error }));
        setLoadedVersion(version);
      });
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const fresh = state.path === path;
  return {
    data: fresh ? state.data : null,
    error: fresh ? state.error : null,
    loading: !path ? false : !fresh || loadedVersion !== version,
  };
}
