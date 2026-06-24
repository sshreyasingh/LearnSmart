import { useState, useEffect, useCallback } from 'react';
import { getProjectAnalysis } from '../api/analysis.api';
import api from '../api/client';

export function useAnalysis(projectId, forceAnalysis = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState('');

  const fetch = useCallback(async (force = false) => {
    if (force) {
      setReanalyzing(true);
      setReanalyzeError('');
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const res = force
        ? await api.get(`/analysis/${projectId}?force=true`)
        : await getProjectAnalysis(projectId);
      setData(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load analysis';
      if (force) {
        setReanalyzeError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      setReanalyzing(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch(forceAnalysis);
  }, [fetch, forceAnalysis]);

  return {
    data, loading, error, reanalyzing, reanalyzeError,
    refetch: fetch,
    reanalyze: () => fetch(true),
    clearReanalyzeError: () => setReanalyzeError(''),
  };
}
