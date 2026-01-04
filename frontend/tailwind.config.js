/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#C8102E', // Yasar Red (Approx)
                secondary: '#1F2937',
                accent: '#F3F4F6',
            },
        },
    },
    plugins: [],
}
