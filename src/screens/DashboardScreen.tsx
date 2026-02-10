import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Navigation, Package, DollarSign, ChevronRight, Activity, MapPin } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';
import { theme } from '../theme';

const DashboardScreen = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: DeliveryService.getProfile,
  });

  const { data: activeDeliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['activeDeliveries'],
    queryFn: DeliveryService.getMyDeliveries,
  });

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const events = ['COURIER_ASSIGNED'];
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['activeDeliveries'] });
    };

    events.forEach(event => socket.on(event, handleUpdate));

    return () => {
      events.forEach(event => socket.off(event, handleUpdate));
    };
  }, [socket, queryClient]);

  const availabilityMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      DeliveryService.updateAvailability(id, available),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courierProfile'] });
    },
  });

  const [isOnline, setIsOnline] = useState(profile?.isAvailable);

  useEffect(() => {
    setIsOnline(profile?.isAvailable);
  }, [profile]);

  const toggleAvailability = () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    if (profile) {
      availabilityMutation.mutate({
        id: profile.id,
        available: nextStatus,
      });
    }
  };

  if (profileLoading || deliveriesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const StatCard = ({ icon: Icon, value, label, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconBadge, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome Back,</Text>
            <Text style={styles.nameText}>{profile?.fullName || 'Courier'}</Text>
          </View>
          <View style={styles.statusBox}>
            <Text style={[styles.statusLabel, { color: isOnline ? theme.colors.success : theme.colors.textMuted }]}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleAvailability}
              trackColor={{ false: theme.colors.border, true: theme.colors.success + '50' }}
              thumbColor={isOnline ? theme.colors.success : theme.colors.white}
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <StatCard
            icon={Truck}
            value={activeDeliveries?.length || 0}
            label="Active Deliveries"
            color={theme.colors.primary}
          />
          <StatCard
            icon={DollarSign}
            value="$0.00"
            label="Today's Earnings"
            color={theme.colors.success}
          />
        </View>

        {/* Active Deliveries Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Activity size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Working Deliveries</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>{t('dashboard.view_all')}</Text>
            </TouchableOpacity>
          </View>

          {activeDeliveries?.length > 0 ? (
            activeDeliveries.map((delivery: any) => (
              <TouchableOpacity key={delivery.id} style={styles.deliveryCard} activeOpacity={0.8}>
                <View style={styles.deliveryHeader}>
                  <View style={styles.orderIdBox}>
                    <Package size={16} color={theme.colors.primary} />
                    <Text style={styles.orderIdText}>#{delivery.orderId.slice(-6)}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{delivery.status}</Text>
                  </View>
                </View>

                <View style={styles.addressSection}>
                  <View style={styles.addressRow}>
                    <View style={styles.dotContainer}>
                      <View style={[styles.dot, { backgroundColor: theme.colors.warning }]} />
                      <View style={styles.connector} />
                    </View>
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressLabel}>Pickup</Text>
                      <Text style={styles.addressText} numberOfLines={1}>{delivery.pickupAddress}</Text>
                    </View>
                  </View>

                  <View style={styles.addressRow}>
                    <View style={styles.dotContainer}>
                      <MapPin size={16} color={theme.colors.primary} />
                    </View>
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressLabel}>Dropoff</Text>
                      <Text style={styles.addressText} numberOfLines={1}>{delivery.deliveryAddress}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.deliveryFooter}>
                  <Text style={styles.footerInfo}>Estimated Time: 25 mins</Text>
                  <ChevronRight size={18} color={theme.colors.border} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Navigation size={40} color={theme.colors.surface} />
              <Text style={styles.emptyText}>No deliveries assigned yet</Text>
              <Text style={styles.emptySubText}>Go online to start receiving orders!</Text>
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.white },
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: {
    padding: theme.spacing.lg,
    paddingTop: 40,
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
    ...theme.shadows.soft,
  },
  welcomeText: { fontSize: 14, color: theme.colors.textMuted },
  nameText: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primary },
  statusBox: { alignItems: 'center' },
  statusLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 },
  statsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    marginTop: -20,
  },
  statCard: {
    backgroundColor: theme.colors.white,
    flex: 0.48,
    padding: 20,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  statIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, textAlign: 'center' },
  section: { padding: theme.spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary, marginLeft: 8 },
  viewAllText: { color: theme.colors.secondary, fontWeight: 'bold', fontSize: 14 },
  deliveryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.soft,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  orderIdBox: { flexDirection: 'row', alignItems: 'center' },
  orderIdText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary, marginLeft: 6 },
  statusBadge: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  statusBadgeText: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  addressSection: { marginBottom: 20 },
  addressRow: { flexDirection: 'row', marginBottom: 2 },
  dotContainer: { alignItems: 'center', width: 24, marginRight: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  connector: { width: 2, flex: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  addressInfo: { flex: 1, paddingBottom: 15 },
  addressLabel: { fontSize: 10, color: theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  addressText: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
  },
  footerInfo: { fontSize: 12, color: theme.colors.textMuted },
  emptyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.background,
    borderStyle: 'dashed',
  },
  emptyText: { marginTop: 16, fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  emptySubText: { marginTop: 4, fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },
});

export default DashboardScreen;
