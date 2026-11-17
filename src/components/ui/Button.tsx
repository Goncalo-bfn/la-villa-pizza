import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactElement,
} from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'hero'
  | 'whatsapp'
  | 'glass'
  | 'chip';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'xl' | 'pill';

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  destructive:
    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
  hero: 'bg-gradient-primary text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.98]',
  whatsapp:
    'bg-whatsapp text-whatsapp-foreground shadow-float transition-all hover:brightness-105 active:scale-[0.98]',
  glass:
    'border border-foreground/15 bg-foreground/5 text-foreground backdrop-blur-md hover:bg-foreground/10',
  chip: 'rounded-full border border-border bg-card text-muted-foreground hover:text-foreground data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-md px-8',
  icon: 'h-9 w-9',
  xl: 'h-12 rounded-xl px-6 text-base',
  pill: 'h-9 rounded-full px-4',
};

export function buttonClasses({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    if (asChild) {
      const child = children as ReactElement<AnchorHTMLAttributes<HTMLAnchorElement>>;
      return (
        <child.type
          {...child.props}
          className={cn(buttonClasses({ variant, size }), child.props.className, className)}
        />
      );
    }

    return (
      <button
        ref={ref}
        className={buttonClasses({ variant, size, className })}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
