import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, StatusBar } from 'react-native';
import {
  AppText as Text,
  Button,
  Card,
  ScreenHeader,
  StatusBadge,
  LoadingState,
  ForwardIcon,
  palette,
  radii,
  space,
} from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import DeviceInfo from 'react-native-device-info';
import { Bike, Globe, LogOut, Phone, Star, IdCard, BadgeCheck, CircleCheck, CircleDashed, type LucideIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { DeliveryService } from '../services/api/deliveryService';
import { useAuth } from '../app/AuthContext';
import { applyLanguage } from '../locales/i18n';
import QueryError from '../components/common/QueryError';

const Row = ({ icon: Icon, label, value, onPress, isLast }: { icon: LucideIcon; label: string; value?: string; onPress?: () => void; isLast?: boolean }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? 'button' : undefined}
    style={({ pressed }) => [styles.row, !isLast && styles.rowDivider, pressed && styles.rowPressed]}
  >
    <View style={styles.rowIcon}>
      <Icon size={20} color={palette.primary} />
    </View>
    <View style={styles.flex}>
      <Text variant="caption" color={palette.textMuted}>{label}</Text>
      {value ? <Text variant="bodyStrong" color={palette.text} numberOfLines={2}>{value}</Text> : null}
    </View>
    {onPress ? <ForwardIcon size={18} color={palette.textMuted} /> : null}
  </Pressable>
);

const ProfileScreen = ({ navigation }: any) => {
  const { t, i18n } = useTranslation();
  const { signOut, signOutAllDevices } = useAuth();
  const isArabic = i18n.language === 'ar';

  const { data: profile, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: DeliveryService.getProfile,
  });

  const logout = async (allDevices: boolean) => {
    try {
      await (allDevices ? signOutAllDevices() : signOut());
      Toast.show({ type: 'info', text1: t('common.logged_out'), text2: t('common.see_soon'), position: 'top' });
    } catch {
      Toast.show({ type: 'error', text1: t('common.logout_failed'), position: 'top' });
    }
  };

  const confirmLogoutAll = () =>
    Alert.alert(t('profile.logout_all_confirm_title'), t('profile.logout_all_confirm_message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logout_all_devices'), style: 'destructive', onPress: () => logout(true) },
    ]);

  const toggleLanguage = useCallback(async () => {
    const needsRestart = await applyLanguage(isArabic ? 'en' : 'ar');
    if (needsRestart) {
      Toast.show({ type: 'info', text1: t('common.language_changed'), text2: t('common.restart_app'), position: 'top', autoHide: false });
    }
  }, [isArabic, t]);

  const header = <ScreenHeader title={t('profile.title')} />;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <LoadingState />
      </SafeAreaView>
    );
  }

  const vehicle = profile?.vehicleType
    ? t(`onboarding.vehicle_${profile.vehicleType.toLowerCase()}`, { defaultValue: profile.vehicleType })
    : t('profile.not_set');
  const ratingValue = profile?.ratingCount ? `${Number(profile.rating).toFixed(1)} (${profile.ratingCount})` : '—';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.surface} />
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!profile && error ? (
          <QueryError error={error} onRetry={refetch} retrying={isRefetching} compact />
        ) : (
          <Card style={styles.identity}>
            <View style={styles.avatar}>
              <Text variant="title" color={palette.primary}>{(profile?.fullName || '?').charAt(0)}</Text>
            </View>
            <View style={styles.flex}>
              <Text variant="heading" color={palette.text} numberOfLines={2}>{profile?.fullName}</Text>
              <StatusBadge
                size="sm"
                tone={profile?.isAvailable ? 'success' : 'neutral'}
                icon={profile?.isAvailable ? CircleCheck : CircleDashed}
                label={profile?.isAvailable ? t('profile.active_now') : t('profile.duty_off')}
                style={styles.badge}
              />
            </View>
          </Card>
        )}

        <Text variant="label" color={palette.textSecondary} style={styles.sectionTitle}>{t('profile.vehicle_and_account')}</Text>
        <Card padded={false}>
          {profile?.courierType ? (
            <Row
              icon={BadgeCheck}
              label={t('profile.courier_type')}
              value={profile.courierType === 'FREELANCE' ? t('profile.type_freelance') : t('profile.type_office')}
            />
          ) : null}
          <Row icon={Bike} label={t('profile.vehicle')} value={vehicle} />
          {profile?.licensePlate ? <Row icon={IdCard} label={t('profile.license_plate')} value={profile.licensePlate} /> : null}
          <Row icon={Phone} label={t('profile.phone_number')} value={profile?.phone || t('profile.not_set')} />
          <Row icon={Star} label={t('profile.my_ratings')} value={ratingValue} onPress={() => navigation.navigate('MyRatings')} isLast />
        </Card>

        <Text variant="label" color={palette.textSecondary} style={styles.sectionTitle}>{t('profile.app_settings')}</Text>
        <Card padded={false}>
          <Row icon={Globe} label={t('profile.language')} value={isArabic ? t('profile.arabic') : t('profile.english')} onPress={toggleLanguage} isLast />
        </Card>

        <Text variant="label" color={palette.textSecondary} style={styles.sectionTitle}>{t('profile.account')}</Text>
        <View style={styles.logout}>
          <Button label={t('common.logout')} icon={LogOut} variant="dangerOutline" onPress={() => logout(false)} fullWidth />
          <Button label={t('common.logout_all_devices')} variant="ghost" onPress={confirmLogoutAll} fullWidth />
        </View>

        <Text variant="caption" color={palette.textMuted} style={styles.version}>
          {t('profile.version_text', { version: `${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})` })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: space.lg, paddingBottom: space.huge },
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  badge: { alignSelf: 'flex-start', marginTop: space.xs },
  sectionTitle: { marginTop: space.xl, marginBottom: space.sm, paddingHorizontal: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  rowPressed: { backgroundColor: palette.surfaceMuted },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  logout: { gap: space.sm },
  version: { textAlign: 'center', marginTop: space.xl },
});

export default ProfileScreen;
