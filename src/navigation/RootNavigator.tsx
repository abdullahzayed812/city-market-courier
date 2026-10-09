import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

export const navigationRef = createNavigationContainerRef();

import {
  LayoutDashboard,
  Truck,
  Briefcase,
  Banknote,
  User,
  ChevronLeft,
} from 'lucide-react-native';
import { TouchableOpacity, Platform, View } from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { theme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import FreelanceOnboardingScreen from '../screens/FreelanceOnboardingScreen';
import ApplicationStatusScreen from '../screens/ApplicationStatusScreen';
import DeliveryDetailsScreen from '../screens/DeliveryDetailsScreen';
import MyRatingsScreen from '../screens/MyRatingsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import JobsScreen from '../screens/JobsScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreen from '../screens/SplashScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';

import { useAuth } from '../app/AuthContext';
import { useSocket } from '../app/SocketContext';
import { useQuery } from '@tanstack/react-query';
import { DeliveryService } from '../services/api/deliveryService';
import { useLocationHeartbeat } from '../hooks/useLocationHeartbeat';

const TERMS_ACCEPTED_KEY = '@citymarket_courier_terms_accepted';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { t } = useTranslation();
  const { data: profile } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: () => DeliveryService.getProfile(),
  });
  const isFreelance = profile?.courierType === 'FREELANCE';
  useLocationHeartbeat(
    isFreelance && profile?.approvalStatus === 'APPROVED' && !!profile?.isAvailable,
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t('dashboard.title'),
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      {isFreelance && (
        <Tab.Screen
          name="Jobs"
          component={JobsScreen}
          options={{
            title: t('jobs.title'),
            tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
          }}
        />
      )}
      <Tab.Screen
        name="Deliveries"
        component={DeliveriesScreen}
        options={{
          title: t('deliveries.title'),
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          title: t('earnings.title'),
          tabBarIcon: ({ color, size }) => (
            <Banknote color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

const RootNavigator = () => {
  const { userToken, isLoading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const [termsAccepted, setTermsAccepted] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    AsyncStorage.getItem(TERMS_ACCEPTED_KEY).then(value => {
      setTermsAccepted(value === 'true');
    });
  }, []);

  const handleAcceptTerms = async () => {
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
    setTermsAccepted(true);
  };

  if (showSplash || isLoading || termsAccepted === null) {
    return <SplashScreen />;
  }

  if (!termsAccepted) {
    return <TermsAndConditionsScreen onAccept={handleAcceptTerms} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerShown: true,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginLeft: 10 }}
              >
                <ChevronLeft color={theme.colors.primary} size={24} />
              </TouchableOpacity>
            ) : null,
          headerTitleStyle: { fontWeight: 'bold', color: theme.colors.primary },
        })}
      >
        {userToken == null ? (
          <Stack.Screen
            name="Auth"
            component={LoginStack}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen
            name="Courier"
            component={CourierGate}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const LoginStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
};

type GateState = 'loading' | 'error' | 'onboarding' | 'review' | 'ready';

// Decides what a signed-in courier sees from their profile:
//   no profile yet (new freelance signup)   -> onboarding (details + documents)
//   pending review / rejected / suspended   -> application status
//   (freelance signups and office couriers added by a manager both need admin approval)
//   otherwise                               -> the app
const CourierGate = () => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { socket } = useSocket();
  const { data: profile, error, isLoading, refetch } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: () => DeliveryService.getProfile(),
    // 404 just means "no profile yet"; don't retry it
    retry: (count, err: any) => err?.response?.status !== 404 && count < 2,
  });

  const notFound = (error as any)?.response?.status === 404;
  const state: GateState = isLoading
    ? 'loading'
    : notFound
    ? 'onboarding'
    : error || !profile
    ? 'error'
    : profile.approvalStatus && profile.approvalStatus !== 'APPROVED'
    ? 'review'
    : 'ready';

  // The gateway joins courier rooms (courier:<id>, courier:freelance) only on connect,
  // so reconnect once the courier gets access to the app.
  const previous = React.useRef<GateState>(state);
  React.useEffect(() => {
    if (state === 'ready' && previous.current !== 'ready' && previous.current !== 'loading' && socket) {
      socket.disconnect();
      socket.connect();
    }
    previous.current = state;
  }, [state, socket]);

  if (state === 'loading') return <SplashScreen />;

  if (state === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
        <Text style={{ color: theme.colors.textMuted, textAlign: 'center' }}>{t('common.error')}</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{t('common.retry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut}>
          <Text style={{ color: theme.colors.textMuted }}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'onboarding') return <FreelanceOnboardingScreen />;
  if (state === 'review') return <ApplicationStatusScreen />;

  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="MyRatings"
        component={MyRatingsScreen}
        options={({ navigation }) => ({
          title: t('ratings.my_ratings'),
          headerTitleStyle: { fontWeight: 'bold', color: theme.colors.primary },
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginEnd: 10 }}>
              <ChevronLeft color={theme.colors.primary} size={24} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="DeliveryDetails"
        component={DeliveryDetailsScreen}
        options={({ navigation }) => ({
          title: t('deliveries.details'),
          headerTitleStyle: { fontWeight: 'bold', color: theme.colors.primary },
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginEnd: 10 }}>
              <ChevronLeft color={theme.colors.primary} size={24} />
            </TouchableOpacity>
          ),
        })}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
