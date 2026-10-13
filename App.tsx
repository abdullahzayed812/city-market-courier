import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APIProvider } from './src/app/APIProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/app/AuthContext';
import { SocketProvider } from './src/app/SocketContext';
import './src/locales/i18n';
import { restoreLanguage } from './src/locales/i18n';
import Toast, { ToastConfigParams } from 'react-native-toast-message';
import { useNotifications } from './src/hooks/useNotifications';
import { AppType } from '@city-market/shared';
import { NotificationBanner } from './src/components/common/NotificationBanner';

// Restore the saved language (Arabic by default) and its layout direction.
restoreLanguage();

const toastConfig = {
  notification: ({ text1, text2, props }: ToastConfigParams<{ onPress?: () => void }>) => (
    <NotificationBanner text1={text1} text2={text2} onPress={props.onPress} />
  ),
};

const AppContent = () => {
  useNotifications(AppType.COURIER);
  return <RootNavigator />;
};

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <APIProvider>
          <SocketProvider>
            <AppContent />
            <Toast config={toastConfig} topOffset={50} />
          </SocketProvider>
        </APIProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
