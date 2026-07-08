import { useState } from 'react';
import logo from './assets/logo.svg';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Setoriza Logo" className="h-10 w-auto" />
          <span className="text-xl font-bold tracking-tight text-setoriza-primary dark:text-blue-400">
            Setoriza
          </span>
        </div>

        <button 
          onClick={toggleTheme}
          className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
        </button>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-4xl mx-auto">
        <div className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-setoriza-blueLight to-setoriza-green rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative px-8 py-6 bg-white dark:bg-slate-900 ring-1 ring-slate-900/5 dark:ring-white/10 rounded-lg leading-none flex items-top justify-start space-x-6">
            <img src={logo} alt="Setoriza Logo" className="h-20 w-auto animate-pulse" />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          Gerenciamento inteligente de <span className="bg-gradient-to-r from-setoriza-blueLight to-setoriza-green bg-clip-text text-transparent">atendimentos WhatsApp</span>
        </h1>
        
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mb-8 leading-relaxed">
          Tire o ruído da comunicação do seu escritório. Centralize, trie automaticamente e direcione os chamados de seus clientes corporativos aos setores corretos.
        </p>

        {/* Brand visual showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-setoriza-primary/10 flex items-center justify-center text-2xl mb-4">
              📘
            </div>
            <h3 className="font-bold text-lg mb-2">Setoriza Primary</h3>
            <code className="text-sm font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">#001638</code>
            <p className="text-xs text-slate-500 mt-2 text-center">Cor da marca e tipografia institucional</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl mb-4">
              🟢
            </div>
            <h3 className="font-bold text-lg mb-2">WhatsApp Green</h3>
            <code className="text-sm font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">#25D366</code>
            <p className="text-xs text-slate-500 mt-2 text-center">Alertas e triagem de novos contatos</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center text-2xl mb-4">
              🔵
            </div>
            <h3 className="font-bold text-lg mb-2">Active Blue</h3>
            <code className="text-sm font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">#24A1DE</code>
            <p className="text-xs text-slate-500 mt-2 text-center">Sessões de chats ativos em andamento</p>
          </div>
        </div>

        <div className="mt-12 flex gap-4">
          <button className="px-8 py-3 rounded-xl bg-setoriza-primary hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-900/10 transition-all duration-300 transform hover:-translate-y-0.5">
            Entrar no Painel
          </button>
          <button className="px-8 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold transition-all duration-300 transform hover:-translate-y-0.5">
            Documentação
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Setoriza. Todos os direitos reservados.
      </footer>
    </div>
  );
}

export default App;
