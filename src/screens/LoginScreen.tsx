import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Truck, ChevronRight } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/api/authService';
import { useAuth } from '../app/AuthContext';
import { theme } from '../theme';

const LoginScreen = () => {
  const { t, i18n } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('courier@citymarket.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === 'ar';

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('common.fill_all_fields'),
        position: 'top',
      });
      return;
    }

    setLoading(true);
    try {
      const data = await AuthService.login({ email, password });
      await signIn(data.accessToken, data.refreshToken);
      Toast.show({
        type: 'success',
        text1: t('auth.login_successful'),
        text2: t('auth.welcome_back_courier'),
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('auth.login_failed_creds'),
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoPlaceholder}>
              <Truck size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth.login_title')}</Text>
            <Text style={styles.subtitle}>{t('auth.login_subtitle')}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Mail size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <>
                  <Text style={styles.buttonText}>{t('common.login')}</Text>
                  <ChevronRight size={20} color={theme.colors.white} style={[{ marginStart: 8 }, isRTL && { transform: [{ rotate: '180deg' }] }]} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.white },
  container: {
    padding: 30,
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...theme.shadows.soft,
  },
  title: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: {
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    height: 60,
    fontSize: 16,
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.primary,
    height: 60,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...theme.shadows.medium,
  },
  disabledButton: {
    backgroundColor: theme.colors.secondary,
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
  },
});

export default LoginScreen;
