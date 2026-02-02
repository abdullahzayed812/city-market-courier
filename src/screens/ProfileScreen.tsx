import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { DeliveryService } from '../services/api/deliveryService';
import { useAuth } from '../app/AuthContext';

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
    } catch (error) {
      Alert.alert(t('common.error'), 'Logout failed');
    }
  };

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    const isRTL = newLang === 'ar';

    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      // In a real app, you might need to restart the app here
      // For now, we just change the language in i18n
    }

    await i18n.changeLanguage(newLang);
    Alert.alert(
      'Language Changed',
      'Please restart the app to apply RTL/LTR changes fully.',
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.fullName?.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{profile?.fullName}</Text>
        <Text style={styles.phone}>{profile?.phone}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('profile.vehicle')}</Text>
          <Text style={styles.infoValue}>{profile?.vehicleType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('profile.availability')}</Text>
          <Text
            style={[
              styles.infoValue,
              { color: profile?.isAvailable ? '#34C759' : '#FF3B30' },
            ]}
          >
            {profile?.isAvailable
              ? t('dashboard.online')
              : t('dashboard.offline')}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.menuItem} onPress={toggleLanguage}>
        <Text style={styles.menuItemText}>{t('profile.language')}</Text>
        <Text style={styles.langValue}>
          {i18n.language === 'ar' ? 'العربية' : 'English'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, styles.logoutItem]}
        onPress={handleLogout}
      >
        <Text style={[styles.menuItemText, styles.logoutText]}>
          {t('common.logout')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  phone: { fontSize: 14, color: '#8E8E93', marginTop: 5 },
  section: { backgroundColor: '#fff', marginTop: 20, paddingHorizontal: 15 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: { fontSize: 16, color: '#3C3C43' },
  infoValue: { fontSize: 16, fontWeight: '600' },
  menuItem: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemText: { fontSize: 16, color: '#000' },
  langValue: { color: '#007AFF', fontWeight: '600' },
  logoutItem: { marginTop: 40, justifyContent: 'center' },
  logoutText: { color: '#FF3B30', fontWeight: 'bold' },
});

export default ProfileScreen;
