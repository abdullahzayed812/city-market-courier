import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { DeliveryService } from '../services/api/deliveryService';

const EarningsScreen = () => {
    const { t } = useTranslation();

    const { data: deliveries, isLoading } = useQuery({
        queryKey: ['myDeliveriesHistory'],
        queryFn: DeliveryService.getMyDeliveries,
    });

    const completedDeliveries = deliveries?.filter((d: any) => d.status === 'delivered') || [];

    const renderHistoryItem = ({ item }: { item: any }) => (
        <View style={styles.historyItem}>
            <View>
                <Text style={styles.orderId}>Order #{item.orderId.slice(-6)}</Text>
                <Text style={styles.date}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.amount}>$15.00</Text>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('earnings.weekly')}</Text>
                <Text style={styles.summaryValue}>${(completedDeliveries.length * 15).toFixed(2)}</Text>
                <Text style={styles.summarySub}>{completedDeliveries.length} {t('deliveries.title')}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t('earnings.history')}</Text>
            <FlatList
                data={completedDeliveries}
                renderItem={renderHistoryItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No delivery history</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryCard: {
        backgroundColor: '#007AFF',
        margin: 15,
        padding: 25,
        borderRadius: 16,
        alignItems: 'center'
    },
    summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
    summaryValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 5 },
    summarySub: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 15, marginTop: 10, marginBottom: 10 },
    listContent: { paddingHorizontal: 15 },
    historyItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    orderId: { fontSize: 16, fontWeight: '600' },
    date: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
    amount: { fontSize: 16, fontWeight: 'bold', color: '#34C759' },
    emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 50 },
});

export default EarningsScreen;
