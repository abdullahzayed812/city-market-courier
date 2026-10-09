import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { Camera, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { PickedImage } from '../../services/api/mediaService';
import { theme } from '../../theme';

// Document photos only need to be readable; keep uploads small.
const PICKER_OPTIONS = { mediaType: 'photo' as const, quality: 0.7 as const, maxWidth: 1600, maxHeight: 1600 };

interface Props {
  label: string;
  hint?: string;
  value: PickedImage | null;
  onChange: (image: PickedImage) => void;
}

export const DocumentPhotoPicker: React.FC<Props> = ({ label, hint, value, onChange }) => {
  const { t } = useTranslation();

  const handleResult = (result: ImagePickerResponse) => {
    if (result.didCancel) return;
    if (result.errorCode) {
      Toast.show({ type: 'error', text1: t('onboarding.photo_error') });
      return;
    }
    const asset = result.assets?.[0];
    if (asset?.uri) onChange({ uri: asset.uri, type: asset.type, fileName: asset.fileName });
  };

  const choose = () =>
    Alert.alert(label, undefined, [
      { text: t('onboarding.take_photo'), onPress: () => launchCamera(PICKER_OPTIONS).then(handleResult) },
      { text: t('onboarding.choose_from_gallery'), onPress: () => launchImageLibrary(PICKER_OPTIONS).then(handleResult) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  return (
    <TouchableOpacity style={[styles.box, value && styles.boxFilled]} onPress={choose} activeOpacity={0.8}>
      {value ? (
        <Image source={{ uri: value.uri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Camera size={28} color={theme.colors.primary} />
        </View>
      )}
      <View style={styles.text}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {value && <CheckCircle2 size={16} color={theme.colors.success} />}
        </View>
        <Text style={styles.hint}>{value ? t('onboarding.tap_to_replace') : hint ?? t('onboarding.tap_to_add')}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.white,
  },
  boxFilled: { borderStyle: 'solid', borderColor: theme.colors.success },
  placeholder: {
    width: 72,
    height: 56,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: { width: 72, height: 56, borderRadius: 8 },
  text: { flex: 1, marginStart: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontWeight: 'bold', color: theme.colors.text },
  hint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});
