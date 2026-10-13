import { Linking } from 'react-native';
import { Delivery, DeliveryStatus } from '@city-market/shared';
import { Bike, CircleCheck, CircleX, Clock, PackageCheck, Store, type LucideIcon } from 'lucide-react-native';
import type { Tone } from '@city-market/mobile-ui';

export const ACTIVE_STATUSES: DeliveryStatus[] = [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.ON_THE_WAY];

export const isActiveDelivery = (d: Pick<Delivery, 'status'>) => ACTIVE_STATUSES.includes(d.status);

/** Badge tone and icon per status (never color alone). */
export const statusMeta = (status: DeliveryStatus): { tone: Tone; icon: LucideIcon } => {
  switch (status) {
    case DeliveryStatus.ASSIGNED:
      return { tone: 'warning', icon: Store };
    case DeliveryStatus.PICKED_UP:
      return { tone: 'brand', icon: PackageCheck };
    case DeliveryStatus.ON_THE_WAY:
      return { tone: 'info', icon: Bike };
    case DeliveryStatus.DELIVERED:
      return { tone: 'success', icon: CircleCheck };
    case DeliveryStatus.FAILED:
      return { tone: 'error', icon: CircleX };
    default:
      return { tone: 'neutral', icon: Clock };
  }
};

export const statusLabelKey = (status: DeliveryStatus) => `deliveries.status_${status.toLowerCase()}`;

// The one forward step a courier can take from each status, and its button label.
export const nextStep = (status: DeliveryStatus): { status: DeliveryStatus; labelKey: string } | null => {
  switch (status) {
    case DeliveryStatus.ASSIGNED:
      return { status: DeliveryStatus.PICKED_UP, labelKey: 'deliveries.confirm_pickup' };
    case DeliveryStatus.PICKED_UP:
      return { status: DeliveryStatus.ON_THE_WAY, labelKey: 'deliveries.start_delivery' };
    case DeliveryStatus.ON_THE_WAY:
      return { status: DeliveryStatus.DELIVERED, labelKey: 'deliveries.confirm_delivered' };
    default:
      return null;
  }
};

export const shortOrderId = (d: Pick<Delivery, 'customerOrderId'>) => `#${d.customerOrderId?.slice(-6) ?? ''}`;

// Sum of the items the courier carries (vendor-confirmed prices); the courier collects this + the delivery fee.
export const itemsTotal = (d: Delivery): number =>
  d.vendorOrders?.reduce(
    (total: number, vo: any) => total + (vo.items?.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0) || 0),
    0,
  ) || 0;

// DECIMAL columns can arrive as strings
const coord = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

// Opens Google Maps directions; falls back to an address search when there are no coordinates.
export const openDirections = (lat: unknown, lng: unknown, address?: string) => {
  const la = coord(lat);
  const ln = coord(lng);
  const url =
    la !== null && ln !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${la},${ln}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`;
  Linking.openURL(url);
};
