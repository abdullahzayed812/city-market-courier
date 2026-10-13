import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AppText as Text, Button, DemoAccounts, ForwardIcon, palette, radii, sizes, space, elevation } from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Truck, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../app/AuthContext';
import { AuthService } from '../services/api/authService';
import Toast from 'react-native-toast-message';
import { DEMO_MODE, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../config/demo';

const LoginScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  // Demo account prefilled while DEMO_MODE is on (see src/config/demo.ts)
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_ACCOUNTS[0].email : '');
  const [password, setPassword] = useState(DEMO_MODE ? DEMO_PASSWORD : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = () => loginWith(email, password);

  const loginWith = async (email: string, password: string) => {
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
      await signIn(data.user, data.accessToken, data.refreshToken);
      Toast.show({
        type: 'success',
        text1: t('auth.login_successful'),
        text2: t('auth.welcome_back_courier'),
        position: 'top',
      });
    } catch {
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={palette.primary} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Truck size={36} color={palette.primary} />
            </View>
            <Text variant="title" color={palette.white} style={styles.center}>{t('auth.login_title')}</Text>
            <Text variant="body" color={palette.primaryMuted} style={styles.center}>{t('auth.login_subtitle')}</Text>
          </View>

          <View style={styles.card}>
            <Text variant="label" color={palette.text} style={styles.label}>{t('auth.email')}</Text>
            <View style={[styles.inputBox, focused === 'email' && styles.inputFocused]}>
              <Mail size={20} color={focused === 'email' ? palette.primary : palette.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="name@company.com"
                placeholderTextColor={palette.textDisabled}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                accessibilityLabel={t('auth.email')}
              />
            </View>

            <Text variant="label" color={palette.text} style={styles.label}>{t('auth.password')}</Text>
            <View style={[styles.inputBox, focused === 'password' && styles.inputFocused]}>
              <Lock size={20} color={focused === 'password' ? palette.primary : palette.textMuted} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={palette.textDisabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                accessibilityLabel={t('auth.password')}
              />
              <Pressable
                onPress={() => setShowPassword(v => !v)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('auth.hide_password') : t('auth.show_password')}
              >
                {showPassword ? <EyeOff size={20} color={palette.textMuted} /> : <Eye size={20} color={palette.textMuted} />}
              </Pressable>
            </View>

            <Button label={t('common.login')} trailingIcon={ForwardIcon} onPress={handleLogin} loading={loading} size="lg" fullWidth style={styles.submit} />
            <Button label={t('signup.join_as_freelancer')} variant="ghost" onPress={() => navigation.navigate('Signup')} fullWidth style={styles.signup} />

            {DEMO_MODE && (
              <DemoAccounts
                title={t('auth.demo_accounts')}
                accounts={DEMO_ACCOUNTS}
                loading={loading}
                accentColor={palette.primary}
                onSelect={account => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                  loginWith(account.email, DEMO_PASSWORD);
                }}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.primary },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  scroll: { flexGrow: 1, justifyContent: 'flex-end' },
  brand: { alignItems: 'center', gap: space.xs, paddingHorizontal: space.xxl, paddingTop: space.huge, paddingBottom: space.xxxl },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    marginBottom: space.md,
    ...elevation.raised,
  },
  card: {
    flexGrow: 1,
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.xl + 4,
    borderTopRightRadius: radii.xl + 4,
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.xxxl,
  },
  label: { marginBottom: space.sm, marginTop: space.md },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: sizes.input,
    paddingHorizontal: space.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.background,
  },
  inputFocused: { borderColor: palette.primary, borderWidth: 1.5, backgroundColor: palette.surface },
  input: { flex: 1, height: '100%', fontSize: 16, color: palette.text },
  submit: { marginTop: space.xxl },
  signup: { marginTop: space.sm },
});

export default LoginScreen;
