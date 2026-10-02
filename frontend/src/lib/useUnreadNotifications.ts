import { useEffect } from 'react';
import { api } from '../api';
import { useApiData } from './useApiData';

const REFRESH_MS = 60_000;

/** Nombre de notifications non lues, rafraîchi périodiquement. */
export function useUnreadNotifications(onTick?: () => void) {
  const unread = useApiData<number>(() => api.notifications.unreadCount(), [], 0);

  useEffect(() => {
    const id = window.setInterval(() => {
      unread.reload();
      onTick?.();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return unread;
}
