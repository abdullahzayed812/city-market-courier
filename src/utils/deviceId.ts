import DeviceInfo from 'react-native-device-info';

// react-native-device-info persists a stable per-install identifier itself —
// no manual UUID generation/AsyncStorage bookkeeping needed.
export async function getDeviceId(): Promise<string> {
  return DeviceInfo.getUniqueId();
}
