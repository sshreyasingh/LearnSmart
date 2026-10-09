import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export function useAnalysis(projectId, forceAnalysis = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [request, setRequest] = useState({ force: forceAnalysis, sequence: 0 });

  useEffect(() => { setData(null); }, [projectId]);
  useEffect(() => {
    let active = true;
    let timer;
    const controller = new AbortController();
    setError('');
    setLoading(true);
    const poll = async (force = false) => {
      try {
        const response = await api.get(`/analysis/${projectId}`, {
          params: force ? { force: true } : {}, signal: controller.signal, timeout: 20000,
        });
        if (!active) return;
        const result = response.data.data;
        setData(result);
        setError(result.errorMessage || '');
        setReanalyzing(!!result.processing);
        if (result.processing) timer = setTimeout(() => poll(false), 5000);
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        setError(err.response?.data?.message || 'Could not check analysis status. Retry to reconnect.');
        setReanalyzing(false);
      } finally {
        if (active) setLoading(false);
      }
    };
    poll(request.force);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [projectId, request]);

  const refetch = useCallback((force = false) => {
    setRequest(previous => ({ force: force === true, sequence: previous.sequence + 1 }));
  }, []);
  return {
    data, loading, error, reanalyzing, reanalyzeError: error,
    refetch, reanalyze: () => refetch(true), clearReanalyzeError: () => setError(''),
  };
}
