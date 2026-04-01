import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APIProvider } from './src/app/APIProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/app/AuthContext';
import { SocketProvider } from './src/app/SocketContext';
import { I18nManager } from 'react-native';
import './src/locales/i18n';
import i18n from './src/locales/i18n';
import Toast, { BaseToastProps } from 'react-native-toast-message';
import { useNotifications } from './src/hooks/useNotifications';
import { AppType } from '@city-market/shared';
import { NotificationBanner } from './src/components/common/NotificationBanner';

// Force RTL if current language is Arabic
const isArabic = i18n.language === 'ar';
if (isArabic && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const toastConfig = {
  notification: ({ text1, text2, props }: BaseToastProps) => (
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
