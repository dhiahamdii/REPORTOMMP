'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchPorts } from '@/lib/api';
import { apiPortToDefinition } from '@/lib/portMappers';
import { PORT_DIRECTORY, type PortDefinition } from '@/lib/portDirectory';

export function usePorts() {
  const [ports, setPorts] = useState<PortDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPorts();
      const mapped = data.map(apiPortToDefinition);
      setPorts(mapped.length > 0 ? mapped : PORT_DIRECTORY);
    } catch (e) {
      console.warn('Ports API unavailable, using built-in directory', e);
      setPorts(PORT_DIRECTORY);
      setError(
        e instanceof Error
          ? e.message
          : 'Impossible de charger les ports depuis le serveur.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getPortById = useCallback(
    (id: string) => ports.find(p => p.id === id),
    [ports],
  );

  return { ports, loading, error, reload, getPortById };
}
