import React from 'react';
import { api } from '../../api';
import { useApp } from '../../context/AppContext';
import { formatDateTime } from '../../lib/labels';
import { useApiData } from '../../lib/useApiData';
import { AppNotification } from '../../types';
import { EmptyState, ErrorState, LoadingState } from '../ui/DesignSystem';

/** Liste des notifications de l'utilisateur connecté (client ou équipe). */
export const NotificationsList: React.FC<{
  tone: 'dark' | 'light';
  onChanged: () => void;
  onOpen: (notification: AppNotification) => void;
}> = ({ tone, onChanged, onOpen }) => {
  const { run } = useApp();
  const notifications = useApiData<AppNotification[]>(() => api.notifications.list(), [], []);
  const unread = notifications.data.filter((n) => !n.read).length;
  const dark = tone === 'dark';

  const markAll = async () => {
    await run(() => api.notifications.markAllRead());
    notifications.setData((list) => list.map((n) => ({ ...n, read: true })));
    onChanged();
  };

  const open = async (n: AppNotification) => {
    if (!n.read) {
      await run(() => api.notifications.markRead(n.id));
      notifications.setData((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      onChanged();
    }
    onOpen(n);
  };

  return (
    <div className="max-w-3xl space-y-4">
      {unread > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={markAll}
            className={`px-4 py-2 rounded-lg border text-xs ${
              dark ? 'border-white/15 text-neutral-200 hover:bg-white/5' : 'border-neutral-300 bg-white hover:bg-neutral-100'
            }`}
          >
            Tout marquer comme lu ({unread})
          </button>
        </div>
      )}
      {notifications.error && <ErrorState message={notifications.error} onRetry={notifications.reload} />}
      {notifications.loading ? (
        <LoadingState tone={tone} />
      ) : notifications.data.length === 0 ? (
        <EmptyState tone={tone} message="Aucune notification pour le moment." />
      ) : (
        <ul className="space-y-3">
          {notifications.data.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={`w-full text-left p-5 rounded-xl border flex items-start justify-between gap-4 transition-colors ${
                  dark
                    ? n.read
                      ? 'bg-[#121418] border-white/10'
                      : 'bg-[#161922] border-[#D49A3D]/50 hover:border-[#D49A3D]'
                    : n.read
                    ? 'bg-white border-neutral-200'
                    : 'bg-amber-50 border-[#D49A3D]/60 hover:border-[#D49A3D]'
                }`}
              >
                <span className="space-y-1">
                  <span className={`flex items-center gap-2 text-sm font-bold ${dark ? 'text-white' : 'text-[#111317]'}`}>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#D49A3D] shrink-0" aria-label="Non lue" />}
                    {n.title}
                  </span>
                  <span className={`block text-xs leading-relaxed ${dark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {n.message}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-neutral-500 shrink-0">{formatDateTime(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Badge du nombre de non-lues. */
export const UnreadBadge: React.FC<{ count: number; className?: string }> = ({ count, className = '' }) =>
  count > 0 ? (
    <span
      className={`min-w-4 h-4 px-1 rounded-full bg-[#D49A3D] text-[#0B0C0E] text-[10px] font-bold flex items-center justify-center ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  ) : null;
