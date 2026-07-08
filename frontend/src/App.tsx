import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Chat } from './pages/Chat';
import { Admin } from './pages/Admin';
import { ProtectedRoute } from './components/ProtectedRoute';
import logo from './assets/logo.svg';

function LandingPage() {
  const [darkMode, setDarkMode] = useState(true);

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
          <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-blue-400">
            Setoriza
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>
          
          <Link
            to="/login"
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-4xl mx-auto">
        <div className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative px-8 py-6 bg-white dark:bg-slate-900 ring-1 ring-slate-900/5 dark:ring-white/10 rounded-lg leading-none flex items-top justify-start space-x-6">
            <img src={logo} alt="Setoriza Logo" className="h-20 w-auto animate-pulse" />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          Gerenciamento inteligente de <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">atendimentos multicanal</span>
        </h1>
        
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mb-8 leading-relaxed">
          Tire o ruído da comunicação do seu escritório. Centralize, trie automaticamente e direcione os chamados de seus clientes corporativos aos setores corretos.
        </p>

        {/* Brand visual showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-2xl mb-4 text-blue-500">
              💬
            </div>
            <h3 className="font-bold text-lg mb-2">WhatsApp</h3>
            <code className="text-sm font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">API Oficial & Web</code>
            <p className="text-xs text-slate-500 mt-2 text-center">Filtros de setor automáticos e triagem inicial</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl mb-4 text-emerald-500">
              ✈️
            </div>
            <h3 className="font-bold text-lg mb-2">Telegram</h3>
            <code className="text-sm font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Próxima Integração</code>
            <p className="text-xs text-slate-500 mt-2 text-center">Contatos e canais corporativos centralizados</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-2xl mb-4 text-purple-500">
              📸
            </div>
            <h3 className="font-bold text-lg mb-2">Instagram</h3>
            <code className="text-sm font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Próxima Integração</code>
            <p className="text-xs text-slate-500 mt-2 text-center">Direct Messages integradas à fila de chamados</p>
          </div>
        </div>

        <div className="mt-12 flex gap-4">
          <Link
            to="/login"
            className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-900/10 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Entrar no Painel
          </Link>
          <a
            href="https://github.com/Randygomesdev/Setoriza"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Documentação
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Setoriza. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['MASTER', 'ADMIN']}>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
