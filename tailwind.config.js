/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'brand-blue': '#3B82F6',
                'brand-green': '#10B981',
                'brand-yellow': '#F59E0B',
                'brand-pink': '#EC4899',
                'brand-background': '#F9FAFB',
                'brand-surface': '#FFFFFF',
                'brand-text-primary': '#1F2937',
                'brand-text-secondary': '#6B7280',
            },
            animation: {
                'wiggle': 'wiggle 1s ease-in-out infinite',
                'float': 'float 3s ease-in-out infinite',
                'pop': 'pop 0.3s ease-out forwards',
            },
            keyframes: {
                wiggle: {
                    '0%, 100%': { transform: 'rotate(-3deg)' },
                    '50%': { transform: 'rotate(3deg)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                pop: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
