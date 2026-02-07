import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APIProvider } from './src/app/APIProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/app/AuthContext';
import { SocketProvider } from './src/app/SocketContext';
import './src/locales/i18n';
import Toast from 'react-native-toast-message';

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
