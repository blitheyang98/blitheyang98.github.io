// Storage utility that uses port-specific keys to allow multiple logins
// Each port (3000, 3001) has its own storage namespace

const getStorageKey = (key: string): string => {
  if (typeof window === 'undefined') return key;
  const port = window.location.port;
  return `${port}_${key}`;
};

export const storage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(getStorageKey(key));
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(getStorageKey(key), value);
  },
  
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(getStorageKey(key));
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return;
    const port = window.location.port;
    // Clear only items for current port
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(`${port}_`)) {
        sessionStorage.removeItem(key);
      }
    });
  },
};

