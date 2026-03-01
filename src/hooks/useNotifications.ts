import { useEffect, useMemo, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  getMessaging,
  RemoteMessage,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  requestPermission,
  getToken as getFcmToken,
  getInitialNotification,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { NotificationService } from '../services/api/notificationService';
import { useAuth } from '../app/AuthContext';
import Toast from 'react-native-toast-message';
import { AppType, PlatformType } from '@city-market/shared';
import { navigationRef } from '../navigation/RootNavigator';

// Pass the app type here (e.g., 'CUSTOMER', 'COURIER')
export const useNotifications = (appType: AppType) => {
  const { user, isAuthenticated } = useAuth();
  const messaging = useMemo(() => getMessaging(), []);
  const isRegistered = useRef(false);

  useEffect(() => {
    if (isAuthenticated && user && !isRegistered.current) {
      isRegistered.current = true;
      setupNotifications();
    }

    // Reset registration flag if user logs out
    if (!isAuthenticated) {
      isRegistered.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const setupNotifications = async () => {
    const hasPermission = await requestUserPermission();
    if (hasPermission) {
      const token = await getToken();
      if (token) {
        // Send appType so backend knows which app to target
        await NotificationService.registerDevice(
          token,
          Platform.OS.toUpperCase() as PlatformType,
          appType,
        );
      }
    }
  };

  useEffect(() => {
    // 1. Handle Foreground Messages
    const unsubscribeOnMessage = onMessage(messaging, async remoteMessage => {
      Toast.show({
        type: 'info',
        text1: remoteMessage.notification?.title,
        text2: remoteMessage.notification?.body,
      });
    });

    // 2. Handle Token Refresh (CRITICAL)
    const unsubscribeTokenRefresh = onTokenRefresh(
      messaging,
      async newToken => {
        console.log('Token refreshed:', newToken);
        await NotificationService.registerDevice(
          newToken,
          Platform.OS.toUpperCase() as PlatformType,
          appType,
        );
      },
    );

    // 3. Background/Quit State Logic
    const unsubscribeNotificationOpened = onNotificationOpenedApp(
      messaging,
      (remoteMessage: RemoteMessage) => {
        handleNotificationNavigation(remoteMessage);
      },
    );

    // 4. Initial Notification Logic (App launched from killed state)
    getInitialNotification(messaging).then(remoteMessage => {
      if (remoteMessage) {
        handleNotificationNavigation(remoteMessage);
      }
    });

    return () => {
      unsubscribeOnMessage();
      unsubscribeTokenRefresh();
      unsubscribeNotificationOpened();
    };
  }, [appType, messaging]);

  const handleNotificationNavigation = (remoteMessage: RemoteMessage) => {
    console.log('Navigating based on notification:', remoteMessage);
    const { type } = remoteMessage.data || {};

    if (type === 'DELIVERY_ASSIGNMENT') {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Deliveries' as never);
      }
    }
  };

  async function requestUserPermission() {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS' as any,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('User denied notification permission');
          return false;
        }
      } catch (err) {
        console.error('Failed to request notification permission', err);
      }
    }

    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }

    return enabled;
  }

  async function getToken() {
    try {
      const fcmToken = await getFcmToken(messaging);
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
      }
      return fcmToken;
    } catch (error) {
      console.error('Failed to get FCM token', error);
    }
  }
};
