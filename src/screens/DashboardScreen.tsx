import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';

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

    // Listen for new assignments or status updates
    const events = ['COURIER_ASSIGNED'];
    // ORDER_READY might be relevant if they have a 'pending pool' view,
    // but definitely COURIER_ASSIGNED is for "My Deliveries"

    const handleUpdate = () => {
      // queryClient.invalidateQueries({ queryKey: ['pendingDeliveries'] });
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

  const toggleAvailability = () => {
    setIsOnline((prev: any) => !prev);
    if (profile) {
      availabilityMutation.mutate({
        id: profile.id,
        available: !profile.isAvailable,
      });
    }
  };

  if (profileLoading || deliveriesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>{t('dashboard.title')}</Text>
          <Text style={styles.name}>{profile?.fullName}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {profile?.isAvailable
              ? t('dashboard.online')
              : t('dashboard.offline')}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleAvailability}
            trackColor={{ false: '#767577', true: '#34C759' }}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeDeliveries?.length || 0}</Text>
          <Text style={styles.statLabel}>
            {t('dashboard.active_deliveries')}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>$0.00</Text>
          <Text style={styles.statLabel}>{t('dashboard.today_earnings')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('dashboard.active_deliveries')}
          </Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>{t('dashboard.view_all')}</Text>
          </TouchableOpacity>
        </View>

        {activeDeliveries?.length > 0 ? (
          activeDeliveries.map((delivery: any) => (
            <View key={delivery.id} style={styles.deliveryCard}>
              <Text style={styles.orderId}>
                Order #{delivery.orderId.slice(-6)}
              </Text>
              <View style={styles.deliveryRow}>
                <Text style={styles.address}>Delivery To:</Text>
                <Text style={styles.address}>{delivery.deliveryAddress}</Text>
              </View>
              <View style={styles.deliveryRow}>
                <Text style={styles.address}>Pickup From:</Text>
                <Text style={styles.address}>{delivery.pickupAddress}</Text>
              </View>
              <View style={styles.deliveryRow}>
                <Text>Status: </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{delivery.status}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No active deliveries</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  welcome: { fontSize: 14, color: '#8E8E93' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  statusContainer: { alignItems: 'center' },
  statusText: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    flex: 0.48,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#8E8E93', marginTop: 5 },
  section: { padding: 15 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  viewAll: { color: '#007AFF', fontWeight: '600' },
  deliveryCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderId: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  address: { fontSize: 14, color: '#3C3C43', marginBottom: 10 },
  statusBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { color: '#007AFF', fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 20 },
});

export default DashboardScreen;
