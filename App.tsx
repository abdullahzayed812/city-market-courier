import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APIProvider } from './src/app/APIProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/app/AuthContext';
import { SocketProvider } from './src/app/SocketContext';
import { I18nManager } from 'react-native';
import './src/locales/i18n';
import i18n from './src/locales/i18n';
import Toast from 'react-native-toast-message';

// Force RTL if current language is Arabic
const isArabic = i18n.language === 'ar';
if (isArabic && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // Note: RN apps often need a restart here, but setting it early helps
}

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <APIProvider>
          <SocketProvider>
            <RootNavigator />
            <Toast />
          </SocketProvider>
        </APIProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
