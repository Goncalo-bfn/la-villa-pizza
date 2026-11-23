import { useEffect, useState } from "react";

export function readStored<T>(key: string, initialValue: T): T {
  const storedValue = window.localStorage.getItem(key);
  if (!storedValue) return initialValue;

  try {
    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.error(`Não foi possível ler os dados salvos em ${key}.`, error);
    throw new Error("Os dados salvos estão inválidos. Limpe o armazenamento local para continuar.");
  }
}

export function useStoredState<T>(
  key: string,
  initialValue: T,
  onStorageError: (message: string) => void,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStored(key, initialValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Não foi possível salvar os dados em ${key}.`, error);
      onStorageError("Não foi possível salvar as alterações neste dispositivo.");
    }
  }, [key, onStorageError, value]);

  return [value, setValue];
}
