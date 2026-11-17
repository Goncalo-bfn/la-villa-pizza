import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Category, MenuState, Product, Settings } from '@/types';
import {
  defaultMenuSnapshot,
  deleteCategoryById,
  deleteProductById,
  fetchMenuData,
  fetchMenuDataOnce,
  insertCategory,
  insertProduct,
  reorderCategories,
  replaceMenuWithSeed,
  saveSettingsData,
  updateCategory,
  updateProduct,
  updateProductAvailability,
} from '@/lib/menuRepository';

interface MenuContextValue {
  menu: MenuState;
  categories: Category[];
  products: Product[];
  settings: Settings;
  isLoading: boolean;
  syncError: string | null;
  syncIssue: MenuSyncIssue | null;
  clearSyncError: () => void;
  reloadMenu: () => Promise<boolean>;
  saveCategory: (category: Category) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  moveCategory: (categoryId: string, direction: -1 | 1) => Promise<boolean>;
  saveProduct: (product: Product) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;
  toggleProduct: (productId: string) => Promise<boolean>;
  saveSettings: (settings: Partial<Settings>) => Promise<boolean>;
  resetMenu: () => Promise<boolean>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export type MenuSyncIssue = 'schema' | 'config' | 'network' | 'unknown';

function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Não foi possível sincronizar o cardápio com o Supabase.';
}

function classifyError(error: unknown): MenuSyncIssue {
  const message = describeError(error);

  if (/schema cache|Could not find the table|PGRST205|relation .* does not exist/i.test(message)) {
    return 'schema';
  }
  if (/Supabase não configurado|VITE_SUPABASE/i.test(message)) {
    return 'config';
  }
  if (/Failed to fetch|NetworkError|fetch failed|Load failed|network/i.test(message)) {
    return 'network';
  }
  return 'unknown';
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState>(() => defaultMenuSnapshot());
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncIssue, setSyncIssue] = useState<MenuSyncIssue | null>(null);
  const menuRef = useRef(menu);

  const commitMenu = useCallback((next: MenuState) => {
    menuRef.current = next;
    setMenu(next);
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    fetchMenuDataOnce()
      .then((loaded) => {
        if (!active) return;
        commitMenu(loaded);
        setSyncError(null);
        setSyncIssue(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSyncError(describeError(error));
        setSyncIssue(classifyError(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [commitMenu]);

  const mutateMenu = useCallback(
    async (nextMenu: MenuState, action: () => Promise<void>) => {
      const previous = menuRef.current;
      commitMenu(nextMenu);

      try {
        await action();
        setSyncError(null);
        setSyncIssue(null);
        return true;
      } catch (error) {
        commitMenu(previous);
        setSyncError(describeError(error));
        setSyncIssue(classifyError(error));
        return false;
      }
    },
    [commitMenu],
  );

  const reloadMenu = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await fetchMenuData();
      commitMenu(loaded);
      setSyncError(null);
      setSyncIssue(null);
      return true;
    } catch (error) {
      setSyncError(describeError(error));
      setSyncIssue(classifyError(error));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [commitMenu]);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
    setSyncIssue(null);
  }, []);

  const saveCategory = useCallback(
    async (category: Category) => {
      const current = menuRef.current;
      const exists = current.categories.some((item) => item.id === category.id);
      return mutateMenu(
        {
          ...current,
          categories: exists
            ? current.categories.map((item) => (item.id === category.id ? category : item))
            : [...current.categories, category],
        },
        () => (exists ? updateCategory(category) : insertCategory(category)),
      );
    },
    [mutateMenu],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      const current = menuRef.current;
      return mutateMenu(
        {
          ...current,
          categories: current.categories.filter((category) => category.id !== categoryId),
          products: current.products.filter((product) => product.categoryId !== categoryId),
        },
        () => deleteCategoryById(categoryId),
      );
    },
    [mutateMenu],
  );

  const moveCategory = useCallback(
    async (categoryId: string, direction: -1 | 1) => {
      const current = menuRef.current;
      const categories = [...current.categories];
      const index = categories.findIndex((category) => category.id === categoryId);
      const target = index + direction;

      if (index < 0 || target < 0 || target >= categories.length) return false;

      [categories[index], categories[target]] = [categories[target], categories[index]];

      return mutateMenu(
        { ...current, categories },
        () => reorderCategories(categories.map((category) => category.id)),
      );
    },
    [mutateMenu],
  );

  const saveProduct = useCallback(
    async (product: Product) => {
      const current = menuRef.current;
      const exists = current.products.some((item) => item.id === product.id);
      return mutateMenu(
        {
          ...current,
          products: exists
            ? current.products.map((item) => (item.id === product.id ? product : item))
            : [...current.products, product],
        },
        () => (exists ? updateProduct(product) : insertProduct(product)),
      );
    },
    [mutateMenu],
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      const current = menuRef.current;
      return mutateMenu(
        {
          ...current,
          products: current.products.filter((product) => product.id !== productId),
        },
        () => deleteProductById(productId),
      );
    },
    [mutateMenu],
  );

  const toggleProduct = useCallback(
    async (productId: string) => {
      const current = menuRef.current;
      const product = current.products.find((item) => item.id === productId);
      if (!product) return false;

      const nextAvailable = !product.available;

      return mutateMenu(
        {
          ...current,
          products: current.products.map((item) =>
            item.id === productId ? { ...item, available: nextAvailable } : item,
          ),
        },
        () => updateProductAvailability(productId, nextAvailable),
      );
    },
    [mutateMenu],
  );

  const saveSettings = useCallback(
    async (settings: Partial<Settings>) => {
      const current = menuRef.current;
      const nextSettings = { ...current.settings, ...settings };
      return mutateMenu(
        { ...current, settings: nextSettings },
        () => saveSettingsData(nextSettings),
      );
    },
    [mutateMenu],
  );

  const resetMenu = useCallback(async () => {
    const nextMenu = defaultMenuSnapshot();
    return mutateMenu(nextMenu, () => replaceMenuWithSeed());
  }, [mutateMenu]);

  const value = useMemo<MenuContextValue>(
    () => ({
      menu,
      categories: menu.categories,
      products: menu.products,
      settings: menu.settings,
      isLoading,
      syncError,
      syncIssue,
      clearSyncError,
      reloadMenu,
      saveCategory,
      deleteCategory,
      moveCategory,
      saveProduct,
      deleteProduct,
      toggleProduct,
      saveSettings,
      resetMenu,
    }),
    [
      menu,
      isLoading,
      syncError,
      syncIssue,
      clearSyncError,
      reloadMenu,
      saveCategory,
      deleteCategory,
      moveCategory,
      saveProduct,
      deleteProduct,
      toggleProduct,
      saveSettings,
      resetMenu,
    ],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) throw new Error('useMenu precisa ser usado dentro de MenuProvider');
  return context;
}
