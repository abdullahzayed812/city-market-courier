import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { Package, MapPin, Navigation, Banknote } from 'lucide-react-native';
import { Delivery } from '@city-market/shared';
import { theme } from '../../theme';

interface Props {
  job: Delivery & { distanceKm?: number | null };
  onClaim: (id: string) => void;
  claiming: boolean;
}

// A claimable pool delivery: stores, destination, distance, fee and "Take it".
export const JobCard: React.FC<Props> = ({ job, onClaim, claiming }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Package size={18} color={theme.colors.primary} />
        <Text style={styles.orderId}>#{job.customerOrderId.slice(-6)}</Text>
        {job.distanceKm != null && (
          <View style={styles.distance}>
            <Navigation size={12} color={theme.colors.textMuted} />
            <Text style={styles.distanceText}>{t('jobs.km_away', { km: job.distanceKm.toFixed(1) })}</Text>
          </View>
        )}
      </View>

      {job.pickupLocations?.map(pl => (
        <View key={pl.id} style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.address} numberOfLines={1}>
            {pl.address}
          </Text>
        </View>
      ))}
      <View style={styles.row}>
        <MapPin size={16} color={theme.colors.error} />
        <Text style={styles.address} numberOfLines={1}>
          {job.deliveryAddress}
        </Text>
      </View>

      <View style={[styles.row, styles.footer]}>
        <Banknote size={16} color={theme.colors.success} />
        <Text style={styles.fee}>{t('jobs.delivery_fee', { amount: job.deliveryFee ?? 0 })}</Text>
        <TouchableOpacity style={[styles.claimButton, claiming && styles.disabled]} disabled={claiming} onPress={() => onClaim(job.id)}>
          <Text style={styles.claimText}>{t('jobs.claim')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.soft,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  orderId: { fontWeight: 'bold', marginStart: 8, color: theme.colors.text, flex: 1 },
  distance: { flexDirection: 'row', alignItems: 'center' },
  distanceText: { fontSize: 12, color: theme.colors.textMuted, marginStart: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginHorizontal: 4 },
  address: { flex: 1, marginStart: 8, color: theme.colors.text },
  footer: { marginTop: 4, marginBottom: 0 },
  fee: { flex: 1, marginStart: 8, fontWeight: 'bold', color: theme.colors.success },
  claimButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 20,
    height: 40,
    justifyContent: 'center',
  },
  claimText: { color: theme.colors.white, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
});
