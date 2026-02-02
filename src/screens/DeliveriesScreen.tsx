import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '../services/api/deliveryService';

const DeliveriesScreen = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: myDeliveries, isLoading: myLoading } = useQuery({
    queryKey: ['myDeliveries'],
    queryFn: DeliveryService.getMyDeliveries,
  });

  const { data: pendingDeliveries, isLoading: pendingLoading } = useQuery({
    queryKey: ['pendingDeliveries'],
    queryFn: DeliveryService.getPendingDeliveries,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      DeliveryService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDeliveries'] });
      queryClient.invalidateQueries({ queryKey: ['pendingDeliveries'] });
    },
  });

  const handleUpdateStatus = (id: string, currentStatus: string) => {
    // status ENUM('PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED') DEFAULT 'PENDING',
    let nextStatus = '';
    if (currentStatus === 'assigned') nextStatus = 'picked_up';
    else if (currentStatus === 'picked_up') nextStatus = 'in_transit';
    else if (currentStatus === 'in_transit') nextStatus = 'delivered';

    if (nextStatus) {
      statusMutation.mutate({ id, status: nextStatus });
    }
  };

  const renderDeliveryItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.orderId.slice(-6)}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>{t('deliveries.pickup')}:</Text>
        <Text style={styles.addressValue}>{item.pickupAddress}</Text>
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>{t('deliveries.delivery')}:</Text>
        <Text style={styles.addressValue}>{item.deliveryAddress}</Text>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleUpdateStatus(item.id, item.status.toLowerCase())}
        disabled={statusMutation.isPending}
      >
        <Text style={styles.actionButtonText}>
          {getNextStatusLabel(item.status, t)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (myLoading || pendingLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={[...(myDeliveries || []), ...(pendingDeliveries || [])]}
        renderItem={renderDeliveryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No deliveries found</Text>
        }
      />
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return '#FF9500';
    case 'picked_up':
      return '#5856D6';
    case 'in_transit':
      return '#007AFF';
    case 'delivered':
      return '#34C759';
    default:
      return '#8E8E93';
  }
};

const getNextStatusLabel = (status: string, t: any) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return t('deliveries.picked_up');
    case 'picked_up':
      return t('deliveries.on_the_way');
    case 'in_transit':
      return t('deliveries.delivered');
    default:
      return t('common.save');
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderId: { fontSize: 18, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addressContainer: { marginBottom: 10 },
  addressLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  addressValue: { fontSize: 14, color: '#000', marginTop: 2 },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 50 },
});

export default DeliveriesScreen;
