import { AlertCircle, CloudOff, Database, RefreshCw, Settings2, X } from 'lucide-react';
import type { MenuSyncIssue } from '@/context/MenuContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface SyncNoticeProps {
  issue: MenuSyncIssue;
  message: string;
  variant?: 'storefront' | 'admin';
  isRetrying?: boolean;
  onRetry: () => void;
  onDismiss?: () => void;
  className?: string;
}

const icons = {
  schema: Database,
  config: Settings2,
  network: CloudOff,
  unknown: AlertCircle,
} as const;

const customerCopy: Record<MenuSyncIssue, { title: string; description: string }> = {
  schema: {
    title: 'Cardápio em atualização',
    description:
      'Não foi possível carregar os dados mais recentes. Estamos exibindo o cardápio padrão enquanto isso.',
  },
  config: {
    title: 'Cardápio temporariamente indisponível',
    description:
      'O serviço do cardápio ainda não está configurado. Avise o lojista para regularizar.',
  },
  network: {
    title: 'Sem conexão com o cardápio',
    description: 'Verifique sua internet e tente novamente em instantes.',
  },
  unknown: {
    title: 'Não foi possível atualizar o cardápio',
    description: 'Estamos exibindo a última versão disponível. Tente novamente em instantes.',
  },
};

const adminCopy: Record<MenuSyncIssue, { title: string; description: string }> = {
  schema: {
    title: 'Banco de dados ainda não configurado',
    description:
      'As tabelas do Supabase não foram encontradas. O painel exibe o cardápio padrão e as alterações não serão salvas até que o schema seja executado.',
  },
  config: {
    title: 'Supabase não configurado',
    description:
      'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidas. As alterações não serão salvas.',
  },
  network: {
    title: 'Falha de conexão com o Supabase',
    description:
      'Não foi possível conectar ao banco. Verifique a internet e tente novamente; as alterações podem não ser salvas.',
  },
  unknown: {
    title: 'Não foi possível sincronizar o cardápio',
    description:
      'O painel está exibindo os últimos dados disponíveis. As alterações podem não ser salvas até a conexão ser restabelecida.',
  },
};

export function SyncNotice({
  issue,
  message,
  variant = 'storefront',
  isRetrying = false,
  onRetry,
  onDismiss,
  className,
}: SyncNoticeProps) {
  const isAdmin = variant === 'admin';
  const copy = (isAdmin ? adminCopy : customerCopy)[issue];
  const Icon = icons[issue];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-accent/25 bg-card/90 shadow-card backdrop-blur',
        isAdmin ? 'p-4' : 'p-3.5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {copy.description}
          </p>
          {isAdmin && (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none underline-offset-4 hover:underline">
                Detalhes técnicos
              </summary>
              <p className="mt-1 break-words rounded-lg bg-muted/60 px-2.5 py-2 font-mono text-[11px] leading-relaxed">
                {message}
              </p>
            </details>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          <RefreshCw className={cn(isRetrying && 'animate-spin')} />
          {isRetrying ? 'Tentando...' : 'Tentar novamente'}
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            aria-label="Fechar aviso de sincronização"
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
