import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/api/authService';
import { useAuth } from '../app/AuthContext';
import { theme } from '../theme';
import { DEMO_MODE, DEMO_PASSWORD } from '../config/demo';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// While DEMO_MODE is on, signup starts with a fresh demo account so it can be tried quickly.
// The email gets a random suffix because each signup needs an unused address.
const demoEmail = () => `courier.demo.${Math.random().toString(36).slice(2, 8)}@citymarket.com`;
const MIN_PASSWORD = 8;

// Step 1 of freelance signup: the account. Signing in right after hands over to the
// onboarding screen (profile + documents), because this user has no courier profile yet.
const SignupScreen = ({ navigation }: any) => {
  const { t, i18n } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(() => (DEMO_MODE ? demoEmail() : ''));
  const [password, setPassword] = useState(DEMO_MODE ? DEMO_PASSWORD : '');
  const [confirmPassword, setConfirmPassword] = useState(DEMO_MODE ? DEMO_PASSWORD : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === 'ar';
  const inputAlign = { textAlign: isRTL ? 'right' : 'left' } as const;

  const validate = (): string | null => {
    if (!EMAIL_RE.test(email.trim())) return t('signup.invalid_email');
    if (password.length < MIN_PASSWORD) return t('signup.password_too_short', { min: MIN_PASSWORD });
    if (password !== confirmPassword) return t('signup.passwords_dont_match');
    return null;
  };

  const handleSignup = async () => {
    const error = validate();
    if (error) {
      Toast.show({ type: 'error', text1: t('common.error'), text2: error, position: 'top' });
      return;
    }

    setLoading(true);
    try {
      const data = await AuthService.register({ email: email.trim().toLowerCase(), password });
      await signIn(data.user, data.accessToken, data.refreshToken);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err?.response?.data?.message || t('signup.failed'),
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}>
              <UserPlus size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>{t('signup.title')}</Text>
            <Text style={styles.subtitle}>{t('signup.subtitle')}</Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Mail size={20} color={theme.colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, inputAlign]}
              placeholder={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color={theme.colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, inputAlign]}
              placeholder={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TouchableOpacity style={styles.inputIcon} onPress={() => setShowPassword(v => !v)}>
              {showPassword ? (
                <EyeOff size={20} color={theme.colors.textMuted} />
              ) : (
                <Eye size={20} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color={theme.colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, inputAlign]}
              placeholder={t('signup.confirm_password')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.buttonText}>{t('signup.create_account')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>{t('signup.have_account')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.white },
  container: { padding: 30, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 36 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...theme.shadows.soft,
  },
  title: { fontSize: 28, fontWeight: theme.typography.weights.bold, color: theme.colors.primary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginBottom: 16,
  },
  inputIcon: { paddingHorizontal: 15 },
  input: { flex: 1, height: 56, fontSize: 16, color: theme.colors.text },
  button: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    ...theme.shadows.medium,
  },
  disabled: { opacity: 0.7 },
  buttonText: { color: theme.colors.white, fontSize: 18, fontWeight: theme.typography.weights.bold },
  link: { alignItems: 'center', marginTop: 24 },
  linkText: { color: theme.colors.primary, fontWeight: '600' },
});

export default SignupScreen;
