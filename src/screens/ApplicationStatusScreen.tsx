import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Ban, LogOut, RefreshCw, Bike } from 'lucide-react-native';
import { EventType } from '@city-market/shared';

import { DeliveryService } from '../services/api/deliveryService';
import { useAuth } from '../app/AuthContext';
import { useSocket } from '../app/SocketContext';
import { theme } from '../theme';

// Shown to a courier (freelance or added by an office) waiting for review, rejected or suspended.
// The navigator gate swaps it for the main app as soon as the profile is APPROVED.
const ApplicationStatusScreen = () => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data: profile, refetch, isRefetching } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: () => DeliveryService.getProfile(),
  });

  // Admin decisions are pushed to user:<id>; refetch so the gate reacts immediately
  useEffect(() => {
    if (!socket) return;
    const onDecision = () => queryClient.invalidateQueries({ queryKey: ['courierProfile'] });
    socket.on(EventType.COURIER_APPROVAL_UPDATED, onDecision);
    return () => {
      socket.off(EventType.COURIER_APPROVAL_UPDATED, onDecision);
    };
  }, [socket, queryClient]);

  const suspended = profile?.approvalStatus === 'SUSPENDED';
  const rejected = profile?.approvalStatus === 'REJECTED';
  const blocked = suspended || rejected;
  const StatusIcon = blocked ? Ban : Clock;
  const accent = blocked ? theme.colors.error : theme.colors.warning;
  const isOffice = profile?.courierType === 'OFFICE';
  const key = suspended ? 'suspended' : rejected ? 'rejected' : isOffice ? 'office_pending' : 'pending';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={[styles.iconCircle, { backgroundColor: accent + '20' }]}>
          <StatusIcon size={44} color={accent} />
        </View>
        <Text style={styles.title}>{t(`application.${key}_title`)}</Text>
        <Text style={styles.body}>{t(`application.${key}_body`)}</Text>

        {profile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('application.submitted_details')}</Text>
            <Row label={t('onboarding.full_name')} value={profile.fullName} />
            <Row label={t('onboarding.phone')} value={profile.phone} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('onboarding.vehicle')}</Text>
              <View style={styles.vehicleValue}>
                <Bike size={14} color={theme.colors.textMuted} />
                <Text style={styles.rowValue}>
                  {profile.vehicleType ? t(`onboarding.vehicle_${profile.vehicleType.toLowerCase()}`) : '—'}
                  {profile.licensePlate ? ` · ${profile.licensePlate}` : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!blocked && (
          <TouchableOpacity style={styles.primary} onPress={() => refetch()} disabled={isRefetching}>
            <RefreshCw size={18} color={theme.colors.white} />
            <Text style={styles.primaryText}>{t('application.check_status')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.logout} onPress={signOut}>
          <LogOut size={18} color={theme.colors.textMuted} />
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value?: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: 24, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  body: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 22 },
  card: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 24,
    ...theme.shadows.soft,
  },
  cardTitle: { fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { color: theme.colors.textMuted },
  rowValue: { color: theme.colors.text, fontWeight: '600' },
  vehicleValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primary: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    marginBottom: 12,
  },
  primaryText: { color: theme.colors.white, fontWeight: 'bold', fontSize: 16 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12 },
  logoutText: { color: theme.colors.textMuted },
});

export default ApplicationStatusScreen;
