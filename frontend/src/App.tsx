import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { PublicWebsite } from './components/public/PublicWebsite';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginScreen } from './components/auth/LoginScreen';
import { readResetParams, ResetPasswordScreen } from './components/auth/PasswordReset';
import { DemoBanner, LoadingState, ToastContainer } from './components/ui/DesignSystem';

/** Une seule connexion : le rôle du compte choisit l'espace affiché.
 *  (Ce n'est pas une sécurité : l'API vérifie les droits de chaque requête.) */
const PlatformRouter: React.FC = () => {
  const { portalMode, user, authReady, setPortalMode } = useApp();
  const [reset, setReset] = useState(readResetParams);

  let content: React.ReactNode;
  if (reset)
    content = (
      <ResetPasswordScreen
        uid={reset.uid}
        token={reset.token}
        onDone={() => {
          setReset(null);
          setPortalMode('space');
        }}
      />
    );
  else if (!authReady) content = <LoadingState label="Connexion à la plateforme…" />;
  else if (portalMode === 'public') content = <PublicWebsite />;
  else if (!user) content = <LoginScreen />;
  else if (user.role === 'client') content = <CustomerPortal />;
  else content = <AdminDashboard />;

  return (
    <>
      <DemoBanner />
      {content}
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <PlatformRouter />
    </AppProvider>
  );
}
