import type { Ionicons } from '@expo/vector-icons';
import type {
  ServiceRequestParty,
  ServiceRequestPriority,
  ServiceRequestStatus,
  ServiceType
} from '@/types/domain';

type IconName = keyof typeof Ionicons.glyphMap;

export type StatusVisual = {
  label: string;
  bg: string;
  fg: string;
};

export type ServiceTypeVisual = {
  label: string;
  icon: IconName;
  bg: string;
  fg: string;
};

export type PriorityVisual = {
  label: string;
  bg: string;
  fg: string;
};

export const SERVICE_REQUEST_STATUS: Record<ServiceRequestStatus, StatusVisual> = {
  PENDING: { label: 'Pendente', bg: '#FFF1D6', fg: '#B07A1A' },
  ACCEPTED: { label: 'Em andamento', bg: '#E5EEF9', fg: '#2E5FA8' },
  COMPLETED: { label: 'Concluida', bg: '#E5F5EC', fg: '#0F7A43' },
  DECLINED: { label: 'Recusada', bg: '#FBE3E3', fg: '#CD3131' }
};

export const SERVICE_TYPE_VISUAL: Record<ServiceType, ServiceTypeVisual> = {
  PLUMBING: {
    label: 'Hidraulica',
    icon: 'water-outline',
    bg: '#E5F5EC',
    fg: '#0F7A43'
  },
  ELECTRICAL: {
    label: 'Eletrica',
    icon: 'bulb-outline',
    bg: '#EFE7FB',
    fg: '#6E3FD0'
  },
  CLEANING: {
    label: 'Limpeza',
    icon: 'sparkles-outline',
    bg: '#E5EEF9',
    fg: '#2E5FA8'
  },
  MAINTENANCE: {
    label: 'Manutencao',
    icon: 'construct-outline',
    bg: '#FFF1D6',
    fg: '#B07A1A'
  },
  SECURITY: {
    label: 'Seguranca',
    icon: 'shield-checkmark-outline',
    bg: '#FBE3E3',
    fg: '#CD3131'
  },
  LANDSCAPING: {
    label: 'Jardinagem',
    icon: 'leaf-outline',
    bg: '#EAF5EF',
    fg: '#0F7A43'
  },
  PEST_CONTROL: {
    label: 'Pragas',
    icon: 'bug-outline',
    bg: '#FBEDD2',
    fg: '#8A6300'
  },
  OTHER: {
    label: 'Outros',
    icon: 'ellipsis-horizontal-circle-outline',
    bg: '#F0F2F1',
    fg: '#444A47'
  }
};

export const PRIORITY_VISUAL: Record<ServiceRequestPriority, PriorityVisual> = {
  LOW: { label: 'Baixa', bg: '#F0F2F1', fg: '#5A6058' },
  MEDIUM: { label: 'Media', bg: '#FFF1D6', fg: '#B07A1A' },
  HIGH: { label: 'Alta', bg: '#FFE4D6', fg: '#B45418' },
  URGENT: { label: 'Urgente', bg: '#FBE3E3', fg: '#CD3131' }
};

export const SERVICE_TYPE_OPTIONS: ServiceType[] = [
  'MAINTENANCE',
  'PLUMBING',
  'ELECTRICAL',
  'CLEANING',
  'SECURITY',
  'LANDSCAPING',
  'PEST_CONTROL',
  'OTHER'
];

export const PRIORITY_OPTIONS: ServiceRequestPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
];

export function getRequesterDisplayName(party: ServiceRequestParty | null): string {
  if (!party) return 'Morador';
  const name =
    typeof party.full_name === 'string' && party.full_name.trim()
      ? party.full_name.trim()
      : typeof party.username === 'string' && party.username
      ? party.username
      : '';
  return name || 'Morador';
}

export function getRequesterApartmentLabel(
  party: ServiceRequestParty | null
): string | null {
  if (!party) return null;
  const apt =
    typeof party.apartment === 'string' && party.apartment.trim()
      ? party.apartment.trim()
      : null;
  if (!apt) return null;
  const block =
    typeof party.block === 'string' && party.block.trim()
      ? party.block.trim()
      : null;
  return block ? `Apto ${apt}/${block}` : `Apto ${apt}`;
}

export function getRequesterId(party: ServiceRequestParty | null): number | null {
  if (!party) return null;
  if (typeof party.id === 'number') return party.id;
  return null;
}
