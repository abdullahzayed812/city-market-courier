import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Truck, Globe, LogOut, ChevronRight, User, Phone, Shield, Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { DeliveryService } from '../services/api/deliveryService';
import { useAuth } from '../app/AuthContext';
import { theme } from '../theme';

const ProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: DeliveryService.getProfile,
  });

  const handleLogout = async () => {
    try {
      signOut();
      Toast.show({
        type: 'info',
        text1: 'Logged Out',
        text2: 'See you soon!',
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Logout Failed',
        position: 'top',
      });
    }
  };

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    const isRTL = newLang === 'ar';

    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      Toast.show({
        type: 'info',
        text1: t('common.language_changed'),
        text2: t('common.restart_app'),
        position: 'top',
        autoHide: false,
      });
    }

    await i18n.changeLanguage(newLang);
  };

  const ProfileMenuItem = ({ icon: Icon, label, value, onPress, isLast = false, color = theme.colors.primary }: any) => (
    <TouchableOpacity
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: color + '10' }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        {value && <Text style={styles.menuValueText}>{value}</Text>}
      </View>
      <ChevronRight size={20} color={theme.colors.border} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.fullName?.charAt(0)}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <User size={16} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.nameText}>{profile?.fullName}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: profile?.isAvailable ? theme.colors.success : theme.colors.error }]} />
            <Text style={styles.statusBadgeText}>
              {profile?.isAvailable ? t('profile.active_now') : t('profile.duty_off')}
            </Text>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.vehicle_and_account')}</Text>
          <View style={styles.menuCard}>
            <ProfileMenuItem
              icon={Truck}
              label={t('profile.vehicle')}
              value={profile?.vehicleType || t('profile.not_set')}
            />
            <ProfileMenuItem
              icon={Phone}
              label={t('profile.phone_number')}
              value={profile?.phone}
              isLast={true}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.app_settings')}</Text>
          <View style={styles.menuCard}>
            <ProfileMenuItem
              icon={Globe}
              label={t('profile.language')}
              value={i18n.language === 'ar' ? 'العربية' : 'English'}
              onPress={toggleLanguage}
            />
            <ProfileMenuItem
              icon={Bell}
              label={t('profile.notifications')}
              value={t('profile.enabled')}
            />
            <ProfileMenuItem
              icon={Shield}
              label={t('profile.privacy_policy')}
              isLast={true}
            />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.error + '10' }]}>
            <LogOut size={20} color={theme.colors.error} />
          </View>
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.versionText}>City market Courier v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.white },
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.white,
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...theme.shadows.soft,
  },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: theme.colors.white, fontSize: 40, fontWeight: 'bold' },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
  nameText: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  section: { padding: theme.spacing.lg, paddingTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  menuCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    paddingVertical: 10,
    ...theme.shadows.soft,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 16, color: theme.colors.primary, fontWeight: '500' },
  menuValueText: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    margin: theme.spacing.lg,
    padding: 15,
    borderRadius: theme.radius.xl,
    ...theme.shadows.soft,
  },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.error },
  footer: { padding: 30, alignItems: 'center' },
  versionText: { fontSize: 12, color: theme.colors.textMuted },
});

export default ProfileScreen;
