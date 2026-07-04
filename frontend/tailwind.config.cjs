module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* Brand / Accent */
        accent: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',  /* primary accent */
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        /* Success */
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        /* Danger */
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        /* Warning */
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        /* Dark surface palette */
        surface: {
          base:  '#0a0b0f',
          900:   '#0f1117',
          800:   '#14161e',
          700:   '#1a1d27',
          600:   '#21253a',
          500:   '#2d3150',
          border: '#252836',
          overlay: 'rgba(10,11,15,0.85)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-app': 'linear-gradient(135deg, #0a0b0f 0%, #111420 50%, #0d0f1a 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'gradient-success': 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
        'gradient-danger': 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(99,102,241,0.35)',
        'glow-success': '0 0 20px rgba(34,197,94,0.35)',
        'glow-danger':  '0 0 20px rgba(239,68,68,0.35)',
        'glass': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        'card': '0 4px 24px rgba(0,0,0,0.5)',
        'toolbar': '0 -1px 0 rgba(255,255,255,0.05), 0 -8px 32px rgba(0,0,0,0.6)',
        'panel': '4px 0 32px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        'xl2': '1.25rem',
        'xl3': '1.5rem',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-100%)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        pulseRing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':       { transform: 'scale(1.15)', opacity: '0.6' },
        },
        typingDot: {
          '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: '0.4' },
          '40%':           { transform: 'scale(1)',   opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-in':         'fadeIn 200ms ease-out both',
        'fade-out':        'fadeOut 200ms ease-in both',
        'slide-in-up':     'slideInUp 250ms cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-right':  'slideInRight 280ms cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-left':   'slideInLeft 280ms cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':        'scaleIn 200ms cubic-bezier(0.16,1,0.3,1) both',
        'shimmer':         'shimmer 2s linear infinite',
        'pulse-ring':      'pulseRing 2s ease-in-out infinite',
        'typing-dot':      'typingDot 1.4s ease-in-out infinite',
        'float':           'float 3s ease-in-out infinite',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
}
