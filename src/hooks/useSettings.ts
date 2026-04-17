import { useState, useEffect } from 'react';
import { api } from '@/services/api';

let cachedSettings: Record<string, any> | null = null;
let fetchPromise: Promise<any> | null = null;

export const useSettings = () => {
  const [settings, setSettings] = useState<Record<string, any>>(cachedSettings || {});
  const [isLoading, setIsLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setIsLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = api.getSettings()
        .then(data => {
          cachedSettings = data;
          return data;
        })
        .catch(() => ({}))
        .finally(() => { fetchPromise = null; });
    }

    fetchPromise.then(data => {
      setSettings(data);
      setIsLoading(false);
    });
  }, []);

  const refresh = async () => {
    try {
      const data = await api.getSettings();
      cachedSettings = data;
      setSettings(data);
    } catch {}
  };

  return { settings, isLoading, refresh };
};

// Utility to invalidate cache (call after admin updates settings)
export const invalidateSettingsCache = () => {
  cachedSettings = null;
};
