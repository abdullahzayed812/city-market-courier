import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Calendar, ChevronRight, DollarSign } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryService } from '../services/api/deliveryService';
import { theme } from '../theme';

const EarningsScreen = () => {
    const { t } = useTranslation();

    const { data: deliveries, isLoading } = useQuery({
        queryKey: ['myDeliveriesHistory'],
        queryFn: DeliveryService.getMyDeliveries,
    });

    const completedDeliveries = deliveries?.filter((d: any) => d.status === 'DELIVERED') || [];
    const totalEarnings = completedDeliveries.length * 15.00;

    const renderHistoryItem = ({ item }: { item: any }) => (
        <View style={styles.historyCard}>
            <View style={styles.historyInfo}>
                <View style={styles.iconCircle}>
                    <Wallet size={18} color={theme.colors.primary} />
                </View>
                <View>
                    <Text style={styles.orderText}>Order #{item.orderId.slice(-6)}</Text>
                    <View style={styles.dateRow}>
                        <Calendar size={12} color={theme.colors.textMuted} />
                        <Text style={styles.dateText}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.amountBadge}>
                <Text style={styles.amountText}>+$15.00</Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
            <View style={styles.container}>
                <View style={styles.mainHeader}>
                    <Text style={styles.headerTitle}>Earnings</Text>
                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>Total Balance</Text>
                        <Text style={styles.totalValue}>${totalEarnings.toFixed(2)}</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Deliveries</Text>
                                <Text style={styles.statValue}>{completedDeliveries.length}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>This Week</Text>
                                <Text style={styles.statValue}>$0.00</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.content}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Transactional History</Text>
                        <TouchableOpacity>
                            <Text style={styles.filterText}>Filter</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={completedDeliveries}
                        renderItem={renderHistoryItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <TrendingUp size={64} color={theme.colors.surface} />
                                <Text style={styles.emptyText}>No earnings history found</Text>
                                <Text style={styles.emptySubText}>Complete deliveries to see your balance grow!</Text>
                            </View>
                        }
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.primary },
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    mainHeader: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginBottom: 20,
        textAlign: 'center',
    },
    totalCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.radius.xl,
        padding: 25,
        alignItems: 'center',
        ...theme.shadows.heavy,
    },
    totalLabel: { fontSize: 13, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    totalValue: { fontSize: 42, fontWeight: 'bold', color: theme.colors.primary, marginVertical: 10 },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: theme.colors.background,
    },
    statItem: { alignItems: 'center', flex: 1 },
    statDivider: { width: 1, height: '100%', backgroundColor: theme.colors.background },
    statLabel: { fontSize: 10, color: theme.colors.textMuted, textTransform: 'uppercase' },
    statValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.secondary, marginTop: 4 },
    content: { flex: 1, padding: theme.spacing.lg, marginTop: -20 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
    filterText: { color: theme.colors.secondary, fontWeight: 'bold' },
    listContent: { paddingBottom: 20 },
    historyCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.radius.lg,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        ...theme.shadows.soft,
    },
    historyInfo: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    orderText: { fontSize: 15, fontWeight: 'bold', color: theme.colors.primary },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    dateText: { fontSize: 12, color: theme.colors.textMuted, marginLeft: 4 },
    amountBadge: {
        backgroundColor: theme.colors.success + '15',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.radius.sm,
    },
    amountText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.success },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { marginTop: 16, fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
    emptySubText: { marginTop: 4, fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
});

export default EarningsScreen;
