import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { DeliveryService } from '../services/api/deliveryService';

const HEARTBEAT_MS = 60_000;

const requestPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true; // iOS prompts on first request
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

// While an approved freelancer is online, report their position every minute so the
// backend can show them nearby jobs (FREELANCE_RADIUS_KM) and notify them.
export const useLocationHeartbeat = (enabled: boolean, onSent?: () => void) => {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const send = () =>
      Geolocation.getCurrentPosition(
        pos => {
          if (cancelled) return;
          DeliveryService.updateLocation(pos.coords.latitude, pos.coords.longitude)
            .then(() => onSent?.())
            .catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 20_000, maximumAge: 30_000 },
      );

    requestPermission().then(granted => {
      if (!granted || cancelled) return;
      send();
      timer = setInterval(send, HEARTBEAT_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [enabled, onSent]);
};
