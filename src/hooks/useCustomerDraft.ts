import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/data/seed';
import { readStorage, writeStorage } from '@/lib/storage';
import type { Customer } from '@/types';

export const EMPTY_CUSTOMER: Customer = {
  name: '',
  phone: '',
  fulfillment: 'entrega',
  street: '',
  number: '',
  district: '',
  reference: '',
  payment: 'pix',
  changeFor: undefined,
  notes: '',
};

export function useCustomerDraft() {
  const [customer, setCustomer] = useState<Customer>(() => {
    const stored = readStorage<Partial<Customer>>(STORAGE_KEYS.customer, {});
    return { ...EMPTY_CUSTOMER, ...stored, notes: '', changeFor: undefined };
  });

  useEffect(() => {
    const { notes: _notes, changeFor: _changeFor, ...persisted } = customer;
    writeStorage(STORAGE_KEYS.customer, persisted);
  }, [customer]);

  const update = (patch: Partial<Customer>) => {
    setCustomer((current) => ({ ...current, ...patch }));
  };

  const resetAfterOrder = () => {
    setCustomer((current) => ({ ...current, notes: '', changeFor: undefined }));
  };

  return { customer, update, resetAfterOrder };
}
