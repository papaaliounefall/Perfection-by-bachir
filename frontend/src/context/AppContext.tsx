import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import {
  AdminPage,
  CurrentUser,
  CustomerPage,
  PortalMode,
  PublicPage,
  ServiceItem,
} from '../types';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'warning';
}

interface AppContextType {
  // Navigation
  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  publicPage: PublicPage;
  setPublicPage: (page: PublicPage) => void;
  customerPage: CustomerPage;
  setCustomerPage: (page: CustomerPage) => void;
  adminPage: AdminPage;
  setAdminPage: (page: AdminPage) => void;
  selectedServiceId: number | null;
  setSelectedServiceId: (id: number | null) => void;
  bookingPreselectedServiceId: number | null;
  startBookingWithService: (serviceId?: number) => void;

  // Authentification (session HttpOnly côté serveur)
  user: CurrentUser | null;
  authReady: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  register: (input: { fullName: string; email: string; phone: string; password: string }) => Promise<CurrentUser>;
  logout: () => Promise<void>;

  // Catalogue public
  services: ServiceItem[];
  servicesLoading: boolean;
  reloadServices: () => Promise<void>;

  // Retours utilisateur
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  /** Exécute une action API ; affiche un toast de succès ou d'erreur. */
  run: <T>(action: () => Promise<T>, success?: string) => Promise<T | undefined>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [portalMode, setPortalModeState] = useState<PortalMode>('public');
  const [publicPage, setPublicPageState] = useState<PublicPage>('home');
  const [customerPage, setCustomerPageState] = useState<CustomerPage>('dashboard');
  const [adminPage, setAdminPageState] = useState<AdminPage>('dashboard');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [bookingPreselectedServiceId, setBookingPreselectedServiceId] = useState<number | null>(null);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (title: string, description?: string, type: ToastMessage['type'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, success?: string) => {
      try {
        const result = await action();
        if (success) addToast(success);
        return result;
      } catch (err) {
        addToast('Action impossible', errorMessage(err), 'warning');
        return undefined;
      }
    },
    [addToast]
  );

  const reloadServices = useCallback(async () => {
    try {
      setServices(await api.services.list());
    } catch (err) {
      addToast('Catalogue indisponible', errorMessage(err), 'warning');
    } finally {
      setServicesLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true));
  }, []);

  // Le catalogue visible dépend du rôle (le personnel voit aussi les prestations suspendues)
  useEffect(() => {
    if (authReady) reloadServices();
  }, [authReady, user?.role, reloadServices]);

  const login = async (email: string, password: string) => {
    const logged = await api.auth.login(email, password);
    setUser(logged);
    return logged;
  };

  const register = async (input: { fullName: string; email: string; phone: string; password: string }) => {
    const created = await api.auth.register(input);
    setUser(created);
    return created;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    setPortalModeState('public');
    setPublicPageState('home');
    scrollTop();
  };

  const value: AppContextType = {
    portalMode,
    setPortalMode: (mode) => {
      setPortalModeState(mode);
      scrollTop();
    },
    publicPage,
    setPublicPage: (page) => {
      setPublicPageState(page);
      scrollTop();
    },
    customerPage,
    setCustomerPage: (page) => {
      setCustomerPageState(page);
      scrollTop();
    },
    adminPage,
    setAdminPage: (page) => {
      setAdminPageState(page);
      scrollTop();
    },
    selectedServiceId,
    setSelectedServiceId,
    bookingPreselectedServiceId,
    startBookingWithService: (serviceId) => {
      setBookingPreselectedServiceId(serviceId ?? null);
      setPortalModeState('public');
      setPublicPageState('booking');
      scrollTop();
    },
    user,
    authReady,
    login,
    register,
    logout,
    services,
    servicesLoading,
    reloadServices,
    toasts,
    addToast,
    dismissToast,
    run,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
