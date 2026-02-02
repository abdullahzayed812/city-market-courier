import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APIProvider } from './src/app/APIProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/app/AuthContext';
import './src/locales/i18n';

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <APIProvider>
          <RootNavigator />
        </APIProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
