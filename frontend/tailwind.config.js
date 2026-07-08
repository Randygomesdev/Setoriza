/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        setoriza: {
          // O azul marinho profundo da marca e tipografia principal
          primary: '#001638', 
          
          // O verde oficial do WhatsApp/Balão superior para novos chamados e alertas
          green: '#25D366', 
          
          // O azul claro/ciano do balão inferior para chamados em andamento
          blueLight: '#24A1DE', 
        },
        // Mapeamento semântico para o padrão do shadcn/ui
        background: {
          light: '#F8FAFC',
          dark: '#020617'
        },
        surface: {
          light: '#FFFFFF',
          dark: '#0F172A'
        }
      }
    },
  },
  plugins: [],
}
