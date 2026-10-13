import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text, Button, Card, StatusBadge, palette, space } from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, Store } from 'lucide-react-native';
import { Delivery } from '@city-market/shared';
import { useFormat } from '../../hooks/useFormat';
import { shortOrderId } from '../../features/deliveries/deliveryHelpers';

interface Props {
  job: Delivery & { distanceKm?: number | null };
  onClaim: (id: string) => void;
  claiming: boolean;
}

// A claimable pool delivery: stores, destination, distance, fee and "Take it".
export const JobCard: React.FC<Props> = ({ job, onClaim, claiming }) => {
  const { t } = useTranslation();
  const { money } = useFormat();
  return (
    <Card appearance="raised" style={styles.card}>
      <View style={styles.top}>
        <Text variant="subheading" color={palette.text}>{shortOrderId(job)}</Text>
        {job.distanceKm != null ? (
          <StatusBadge size="sm" tone="neutral" icon={Navigation} label={t('jobs.km_away', { km: job.distanceKm.toFixed(1) })} />
        ) : null}
      </View>

      {job.pickupLocations?.map(pl => (
        <View key={pl.id} style={styles.line}>
          <Store size={16} color={palette.primary} />
          <Text variant="body" color={palette.text} numberOfLines={1} style={styles.flex}>{pl.address}</Text>
        </View>
      ))}
      <View style={styles.line}>
        <MapPin size={16} color={palette.accentText} />
        <Text variant="body" color={palette.text} numberOfLines={1} style={styles.flex}>{job.deliveryAddress}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.flex}>
          <Text variant="caption" color={palette.textMuted}>{t('jobs.fee_label')}</Text>
          <Text variant="heading" color={palette.primary} style={styles.tabular}>{money(job.deliveryFee ?? 0)}</Text>
        </View>
        <Button label={t('jobs.claim')} onPress={() => onClaim(job.id)} disabled={claiming} size="lg" style={styles.claim} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: space.sm },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.md,
    marginTop: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  claim: { minWidth: 120 },
});
