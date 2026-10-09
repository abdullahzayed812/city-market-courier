import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Bike, Car, Footprints, LogOut } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { DocumentPhotoPicker } from '../components/onboarding/DocumentPhotoPicker';
import { MediaService, PickedImage } from '../services/api/mediaService';
import { DeliveryService } from '../services/api/deliveryService';
import { useAuth } from '../app/AuthContext';
import { theme } from '../theme';
import { DEMO_MODE } from '../config/demo';

const VEHICLES = [
  { value: 'Motorcycle', icon: Bike },
  { value: 'Car', icon: Car },
  { value: 'Bicycle', icon: Footprints },
] as const;
type Vehicle = (typeof VEHICLES)[number]['value'];

const PHONE_RE = /^\+?[0-9]{10,15}$/;

// While DEMO_MODE is on, onboarding starts with demo details; only the document photos still need picking.
// Random phone digits because the phone is the courier's contact number.
const demoPhone = () => `010${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

// Step 2 of freelance signup: the courier profile and documents. On success the
// profile exists with PENDING_REVIEW and the navigator switches to the status screen.
const FreelanceOnboardingScreen = () => {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'ar';
  const inputAlign = { textAlign: isRTL ? 'right' : 'left' } as const;

  const [fullName, setFullName] = useState(DEMO_MODE ? 'مندوب تجريبي' : '');
  const [phone, setPhone] = useState(() => (DEMO_MODE ? demoPhone() : ''));
  const [vehicleType, setVehicleType] = useState<Vehicle>('Motorcycle');
  const [licensePlate, setLicensePlate] = useState(DEMO_MODE ? 'أ ب ج - 999' : '');
  const [nationalId, setNationalId] = useState<PickedImage | null>(null);
  const [license, setLicense] = useState<PickedImage | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Matches the backend rule: anything motorised needs a license
  const needsLicense = vehicleType !== 'Bicycle';

  const validate = (): string | null => {
    if (fullName.trim().split(/\s+/).length < 2) return t('onboarding.full_name_required');
    if (!PHONE_RE.test(phone.replace(/[\s-]/g, ''))) return t('onboarding.invalid_phone');
    if (needsLicense && !licensePlate.trim()) return t('onboarding.plate_required');
    if (!nationalId) return t('onboarding.national_id_required');
    if (needsLicense && !license) return t('onboarding.license_required');
    return null;
  };

  const submit = async () => {
    const error = validate();
    if (error) {
      Toast.show({ type: 'error', text1: error });
      return;
    }
    // Which step failed, for a useful message when the server gives none (e.g. network error)
    let failedStep = 'onboarding.upload_failed';
    try {
      setProgress(t('onboarding.uploading_id'));
      const nationalIdUrl = await MediaService.uploadCourierDocument(nationalId!);
      let licenseUrl: string | undefined;
      if (needsLicense && license) {
        setProgress(t('onboarding.uploading_license'));
        licenseUrl = await MediaService.uploadCourierDocument(license);
      }
      failedStep = 'onboarding.submit_failed';
      setProgress(t('onboarding.submitting'));
      await DeliveryService.registerFreelancer({
        fullName: fullName.trim(),
        phone: phone.replace(/[\s-]/g, ''),
        vehicleType,
        licensePlate: needsLicense ? licensePlate.trim() : undefined,
        nationalIdUrl,
        licenseUrl,
      });
      // The navigator gate re-reads the profile and moves on to the review screen
      await queryClient.invalidateQueries({ queryKey: ['courierProfile'] });
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message;
      Toast.show({
        type: 'error',
        text1: serverMessage || t(failedStep),
        text2: serverMessage ? undefined : err?.response?.status ? `HTTP ${err.response.status}` : err?.message,
      });
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            <Text style={styles.title}>{t('onboarding.title')}</Text>
            <TouchableOpacity onPress={signOut} disabled={busy} hitSlop={10}>
              <LogOut size={22} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

          <Text style={styles.section}>{t('onboarding.personal_info')}</Text>
          <TextInput
            style={[styles.input, inputAlign]}
            placeholder={t('onboarding.full_name')}
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={[styles.input, inputAlign]}
            placeholder={t('onboarding.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.section}>{t('onboarding.vehicle')}</Text>
          <View style={styles.vehicles}>
            {VEHICLES.map(({ value, icon: Icon }) => {
              const selected = vehicleType === value;
              return (
                <TouchableOpacity key={value} style={[styles.vehicle, selected && styles.vehicleSelected]} onPress={() => setVehicleType(value)}>
                  <Icon size={24} color={selected ? theme.colors.white : theme.colors.primary} />
                  <Text style={[styles.vehicleText, selected && styles.vehicleTextSelected]}>
                    {t(`onboarding.vehicle_${value.toLowerCase()}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {needsLicense && (
            <TextInput
              style={[styles.input, inputAlign]}
              placeholder={t('onboarding.license_plate')}
              value={licensePlate}
              onChangeText={setLicensePlate}
              placeholderTextColor={theme.colors.textMuted}
            />
          )}

          <Text style={styles.section}>{t('onboarding.documents')}</Text>
          <DocumentPhotoPicker
            label={t('onboarding.national_id')}
            hint={t('onboarding.national_id_hint')}
            value={nationalId}
            onChange={setNationalId}
          />
          {needsLicense && (
            <DocumentPhotoPicker
              label={t('onboarding.driving_license')}
              hint={t('onboarding.driving_license_hint')}
              value={license}
              onChange={setLicense}
            />
          )}
          <Text style={styles.privacy}>{t('onboarding.documents_privacy')}</Text>

          <TouchableOpacity style={[styles.button, busy && styles.disabled]} onPress={submit} disabled={busy}>
            {busy ? (
              <View style={styles.progressRow}>
                <ActivityIndicator color={theme.colors.white} />
                <Text style={styles.progressText}>{progress}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>{t('onboarding.submit')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.white },
  container: { padding: 24, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primary },
  subtitle: { color: theme.colors.textMuted, marginTop: 6, marginBottom: 8 },
  section: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 20, marginBottom: 10 },
  input: {
    height: 52,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
  },
  vehicles: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  vehicle: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  vehicleSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  vehicleText: { marginTop: 6, color: theme.colors.text, fontWeight: '600' },
  vehicleTextSelected: { color: theme.colors.white },
  privacy: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 },
  button: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    ...theme.shadows.medium,
  },
  disabled: { opacity: 0.8 },
  buttonText: { color: theme.colors.white, fontSize: 17, fontWeight: 'bold' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { color: theme.colors.white, fontWeight: '600' },
});

export default FreelanceOnboardingScreen;
