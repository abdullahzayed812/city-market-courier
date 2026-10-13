import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text, Card, StatusBadge, ForwardIcon, palette, space } from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { MapPin, Store } from 'lucide-react-native';
import { Delivery, DeliveryStatus } from '@city-market/shared';
import { PickupCountdownBadge } from './PickupCountdownBadge';
import { shortOrderId, statusLabelKey, statusMeta } from '../../features/deliveries/deliveryHelpers';
import { useFormat } from '../../hooks/useFormat';

interface Props {
  item: Delivery;
  onPress: (id: string) => void;
}

/** Compact delivery summary; everything else lives on DeliveryDetailsScreen. */
export const DeliveryRow = React.memo(({ item, onPress }: Props) => {
  const { t, i18n } = useTranslation();
  const { money } = useFormat();
  const meta = statusMeta(item.status);
  const stores = item.pickupLocations ?? [];
  return (
    <Card appearance="raised" onPress={() => onPress(item.id)} accessibilityLabel={shortOrderId(item)} style={styles.card}>
      <View style={styles.top}>
        <Text variant="subheading" color={palette.text}>{shortOrderId(item)}</Text>
        <StatusBadge size="sm" label={t(statusLabelKey(item.status))} tone={meta.tone} icon={meta.icon} />
      </View>
      <View style={styles.line}>
        <Store size={16} color={palette.primary} />
        <Text variant="body" color={palette.text} numberOfLines={1} style={styles.flex}>
          {stores.length > 1 ? t('deliveries.stores_count', { count: stores.length }) : stores[0]?.address ?? '—'}
        </Text>
      </View>
      <View style={styles.line}>
        <MapPin size={16} color={palette.accentText} />
        <Text variant="body" color={palette.text} numberOfLines={1} style={styles.flex}>{item.deliveryAddress}</Text>
      </View>
      <View style={styles.bottom}>
        {item.status === DeliveryStatus.ASSIGNED ? (
          <PickupCountdownBadge deadline={item.pickupDeadline} />
        ) : (
          <Text variant="caption" color={palette.textMuted}>
            {new Date(item.deliveredAt ?? item.assignedAt ?? item.createdAt).toLocaleString(i18n.language, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
        <View style={styles.flex} />
        {item.deliveryFee != null ? (
          <Text variant="bodyStrong" color={palette.primary} style={styles.tabular}>{money(item.deliveryFee)}</Text>
        ) : null}
        <ForwardIcon size={18} color={palette.textMuted} />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: space.sm },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.sm,
    marginTop: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
});
