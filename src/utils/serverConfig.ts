import AsyncStorage from '@react-native-async-storage/async-storage';
import { createServerConfig } from '@city-market/mobile-ui';

// Release builds use production. In development, switch between `npm run dev` (:3000)
// and Docker (:80) from the dev menu; the host is detected from Metro.
export const { getApiBaseURL, getSocketURL } = createServerConfig({ storage: AsyncStorage });
