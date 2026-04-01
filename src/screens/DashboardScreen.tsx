import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bike,
  Package,
  MapPin,
  ChevronRight,
  User,
  Star,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { DeliveryService } from '../services/api/deliveryService';
import { useAuth } from '../app/AuthContext';
import { theme } from '../theme';
import { useSocket } from '../app/SocketContext';
import { EventType, DeliveryStatus } from '@city-market/shared';

const DashboardScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: () => DeliveryService.getProfile(),
  });

  const {
    data: activeDeliveries,
    isLoading: deliveriesLoading,
    refetch: refetchDeliveries,
  } = useQuery({
    queryKey: ['activeDeliveries'],
    queryFn: () => DeliveryService.getMyDeliveries(),
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: (isAvailable: boolean) =>
      DeliveryService.updateAvailability(profile!.id, isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courierProfile'] });
    },
  });

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['activeDeliveries'] });
    };

    socket.on(EventType.DELIVERY_CREATED, handleUpdate);
    socket.on(EventType.COURIER_ASSIGNED, handleUpdate);

    return () => {
      socket.off(EventType.DELIVERY_CREATED, handleUpdate);
      socket.off(EventType.COURIER_ASSIGNED, handleUpdate);
    };
  }, [socket, queryClient]);

  const toggleAvailability = () => {
    if (profile) {
      updateAvailabilityMutation.mutate(!profile.isAvailable);
    }
  };

  if (profileLoading || deliveriesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={deliveriesLoading}
            onRefresh={refetchDeliveries}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>{t('common.welcome')},</Text>
            <Text style={styles.nameText}>
              {profile?.fullName || user?.email}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <User color={theme.colors.primary} size={24} />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusInfo}>
            <View style={styles.statusIconContainer}>
              <Bike color={theme.colors.primary} size={24} />
            </View>
            <View>
              <Text style={styles.statusLabel}>
                {t('couriers.availability')}
              </Text>
              <Text style={styles.statusValue}>
                {profile?.isAvailable
                  ? t('common.active')
                  : t('common.inactive')}
              </Text>
            </View>
          </View>
          <Switch
            value={profile?.isAvailable}
            onValueChange={toggleAvailability}
            trackColor={{ false: '#D1D5DB', true: theme.colors.primary + '33' }}
            thumbColor={profile?.isAvailable ? theme.colors.primary : '#F3F4F6'}
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Star
              color={theme.colors.warning}
              size={20}
              fill={theme.colors.warning}
            />
            <Text style={styles.statValue}>
              {profile?.rating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.statLabel}>{t('couriers.rating')}</Text>
          </View>
          <View style={styles.statBox}>
            <CheckCircle2 color={theme.colors.success} size={20} />
            <Text style={styles.statValue}>
              {profile?.totalDeliveries || 0}
            </Text>
            <Text style={styles.statLabel}>{t('couriers.deliveries')}</Text>
          </View>
        </View>

        {/* Active Deliveries */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('deliveries.active_title')}
          </Text>
        </View>

        <View style={styles.deliveriesContainer}>
          {(activeDeliveries?.length ?? 0) > 0 ? (
            activeDeliveries?.map((delivery: any) => (
              <TouchableOpacity
                key={delivery.id}
                style={styles.deliveryCard}
                onPress={() => navigation.navigate('Deliveries')}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.orderInfo}>
                    <Package size={18} color={theme.colors.primary} />
                    <Text style={styles.orderId}>
                      #{delivery.customerOrderId.slice(-6)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(delivery.status) + '15',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(delivery.status) },
                      ]}
                    >
                      {t(`deliveries.status_${delivery.status.toLowerCase()}`)}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationInfo}>
                  <View style={styles.locationItem}>
                    <View style={styles.dot} />
                    <View style={styles.locationDetails}>
                      <Text style={styles.locationLabel}>
                        {t('deliveries.pickup')}
                      </Text>
                      {delivery?.pickupLocations?.map((pl: any) => (
                        <Text
                          key={pl.id}
                          style={styles.addressText}
                          numberOfLines={1}
                        >
                          {pl.address}
                        </Text>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.locationItem, { marginTop: 12 }]}>
                    <MapPin size={16} color={theme.colors.error} />
                    <View style={styles.locationDetails}>
                      <Text style={styles.locationLabel}>
                        {t('deliveries.destination')}
                      </Text>
                      <Text style={styles.addressText} numberOfLines={1}>
                        {delivery.deliveryAddress}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.timeInfo}>
                    <Clock size={14} color={theme.colors.textMuted} />
                    <Text style={styles.timeText}>
                      {new Date(delivery.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={theme.colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Package
                size={48}
                color={theme.colors.textMuted}
                style={{ opacity: 0.3 }}
              />
              <Text style={styles.emptyText}>{t('deliveries.no_active')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStatusColor = (status: DeliveryStatus) => {
  switch (status) {
    case DeliveryStatus.PENDING:
      return '#FF9500';
    case DeliveryStatus.ASSIGNED:
      return theme.colors.primary;
    case DeliveryStatus.PICKED_UP:
      return '#5856D6';
    case DeliveryStatus.ON_THE_WAY:
      return theme.colors.accent;
    case DeliveryStatus.DELIVERED:
      return theme.colors.success;
    default:
      return theme.colors.textMuted;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  welcomeText: { fontSize: 14, color: theme.colors.textMuted },
  nameText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  statusCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    ...theme.shadows.soft,
  },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusLabel: { fontSize: 12, color: theme.colors.textMuted },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  sectionHeader: { marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  deliveriesContainer: { gap: 15 },
  deliveryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontWeight: 'bold', fontSize: 15, color: theme.colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  locationInfo: { marginBottom: 15 },
  locationItem: { flexDirection: 'row', gap: 12 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  locationDetails: { flex: 1 },
  locationLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  addressText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 12, color: theme.colors.textMuted },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});

export default DashboardScreen;
