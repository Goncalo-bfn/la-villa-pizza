/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'oklch(var(--background) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'oklch(var(--card) / <alpha-value>)',
          foreground: 'oklch(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
          foreground: 'oklch(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          glow: 'oklch(var(--primary-glow) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
          foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
          foreground: 'oklch(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
          foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)',
        },
        whatsapp: {
          DEFAULT: 'oklch(var(--whatsapp) / <alpha-value>)',
          foreground: 'oklch(var(--whatsapp-foreground) / <alpha-value>)',
        },
        success: 'oklch(var(--success) / <alpha-value>)',
        cream: 'oklch(var(--cream) / <alpha-value>)',
        border: 'oklch(var(--border) / <alpha-value>)',
        input: 'oklch(var(--input) / <alpha-value>)',
        ring: 'oklch(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        script: ['"Kaushan Script"', 'cursive'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 12px)',
      },
      boxShadow: {
        glow: '0 12px 32px -10px oklch(var(--primary) / 0.65)',
        card: '0 18px 40px -22px oklch(0% 0 0 / 0.7)',
        float: '0 14px 30px -8px oklch(var(--whatsapp) / 0.6)',
      },
      backgroundImage: {
        'gradient-primary':
          'linear-gradient(135deg, oklch(var(--primary)), oklch(var(--primary-glow)))',
        'hero-overlay':
          'linear-gradient(90deg, oklch(13% 0.012 45 / 0.96) 0%, oklch(13% 0.012 45 / 0.82) 40%, oklch(13% 0.012 45 / 0.25) 75%, oklch(13% 0.012 45 / 0.1) 100%)',
        'hero-fade':
          'linear-gradient(180deg, transparent 55%, oklch(var(--background)) 100%)',
        'flag':
          'linear-gradient(90deg, oklch(var(--secondary)) 0 33.33%, oklch(var(--cream)) 33.33% 66.66%, oklch(var(--primary)) 66.66% 100%)',
        'card-img-fade':
          'linear-gradient(180deg, transparent 50%, oklch(13% 0.012 45 / 0.75) 100%)',
        wood: 'var(--wood-grain)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(-2deg)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 oklch(var(--whatsapp) / 0.55)' },
          '70%': { boxShadow: '0 0 0 16px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'sheet-up': {
          from: { opacity: '0', transform: 'translateY(24px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 6s ease-in-out infinite',
        pop: 'pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-ring': 'pulse-ring 2.2s ease-out infinite',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 0.25s ease-out',
        'sheet-up': 'sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
