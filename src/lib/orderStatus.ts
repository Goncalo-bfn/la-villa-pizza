import type { OrderStatus } from '@/types';

export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; className: string; dot: string }
> = {
  novo: {
    label: 'Novo',
    className: 'bg-primary/10 text-primary',
    dot: 'bg-primary',
  },
  preparo: {
    label: 'Em preparo',
    className: 'bg-accent text-accent-foreground',
    dot: 'bg-accent-foreground',
  },
  saiu: {
    label: 'Saiu para entrega',
    className: 'bg-secondary text-secondary-foreground',
    dot: 'bg-secondary-foreground',
  },
  concluido: {
    label: 'Concluído',
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
};

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'novo',
  'preparo',
  'saiu',
  'concluido',
  'cancelado',
];
