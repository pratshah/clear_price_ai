const colors = ['blue', 'purple', 'green', 'amber', 'rose', 'emerald', 'teal', 'violet', 'orange', 'pink', 'yellow', 'slate', 'red']
const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  safelist: [
    ...colors.flatMap(c => shades.flatMap(s => [
      `bg-${c}-${s}`,
      `text-${c}-${s}`,
      `border-${c}-${s}`,
    ])),
    'bg-blue-500/5', 'bg-green-500/5', 'bg-purple-500/5', 'bg-amber-500/5',
    'bg-rose-500/5', 'bg-teal-500/5', 'bg-orange-500/5', 'bg-violet-500/5',
    'bg-blue-50/50', 'bg-purple-50/50', 'bg-green-50/50',
    'border-blue-500/40', 'border-green-500/40', 'border-purple-500/40',
    'border-amber-500/40', 'border-rose-500/40', 'border-teal-500/40',
    'border-orange-500/40', 'border-violet-500/40',
    'w-7', 'h-7', 'w-8', 'h-8',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#1B4FE8',
        cheap: '#16A34A',
        expensive: '#DC2626',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
