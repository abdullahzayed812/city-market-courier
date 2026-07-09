import * as Keychain from 'react-native-keychain';

// Auth tokens must never live in AsyncStorage (plain, unencrypted). Each token
// is stored under its own Keychain/Keystore-backed "service" namespace.
const ACCESS_TOKEN_SERVICE = 'com.citymarket.courier.auth_token';
const REFRESH_TOKEN_SERVICE = 'com.citymarket.courier.refresh_token';

async function setSecureValue(service: string, value: string): Promise<void> {
  await Keychain.setGenericPassword('token', value, { service });
}

async function getSecureValue(service: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword({ service });
  return result ? result.password : null;
}

async function clearSecureValue(service: string): Promise<void> {
  await Keychain.resetGenericPassword({ service });
}

export const SecureStorage = {
  getAccessToken: () => getSecureValue(ACCESS_TOKEN_SERVICE),
  setAccessToken: (value: string) => setSecureValue(ACCESS_TOKEN_SERVICE, value),
  clearAccessToken: () => clearSecureValue(ACCESS_TOKEN_SERVICE),
  getRefreshToken: () => getSecureValue(REFRESH_TOKEN_SERVICE),
  setRefreshToken: (value: string) => setSecureValue(REFRESH_TOKEN_SERVICE, value),
  clearRefreshToken: () => clearSecureValue(REFRESH_TOKEN_SERVICE),
  clearAll: async () => {
    await clearSecureValue(ACCESS_TOKEN_SERVICE);
    await clearSecureValue(REFRESH_TOKEN_SERVICE);
  },
};
