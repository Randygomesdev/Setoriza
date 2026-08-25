import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import logoWhite from '../assets/logoWhite.svg';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const { login, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.requirePasswordChange) {
        navigate('/change-password', { replace: true });
      } else if (user?.role === 'MASTER') {
        navigate('/master', { replace: true });
      } else if (user?.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/chat', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.auth.login(email, password);
      
      login(response.token, {
        id: response.id,
        name: response.name,
        email: response.email,
        role: response.role,
        pictureUrl: response.pictureUrl,
        requirePasswordChange: response.requirePasswordChange,
      });
      
      if (response.requirePasswordChange) {
        navigate('/change-password');
      } else if (response.role === 'MASTER') {
        navigate('/master');
      } else {
        navigate('/chat');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, preencha o campo de e-mail.');
      return;
    }

    setLoading(true);
    setError(null);
    setForgotPasswordSuccess(false);

    try {
      await api.auth.forgotPassword(email);
      setForgotPasswordSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar redefinição. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setForgotPasswordSuccess(false);
    setError(null);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden px-4">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md z-10">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={logoWhite} alt="Setoriza Logo" className="h-14 w-auto object-contain transition-transform hover:scale-105 duration-300 mb-4" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center opacity-80">
            Painel de Atendimento
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          {!isForgotPassword ? (
            <>
              <h2 className="text-xl font-bold text-slate-100 mb-6">Acesse sua conta</h2>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="exemplo@setoriza.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors bg-transparent border-0 cursor-pointer"
                      disabled={loading}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 bg-transparent border-0 cursor-pointer"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer select-none"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Recuperar senha</h2>
              <p className="text-slate-400 text-xs mb-6">
                Informe o seu e-mail de cadastro. Enviaremos um link de redefinição para a sua caixa de entrada.
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {forgotPasswordSuccess ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-sm">
                    E-mail de recuperação enviado com sucesso! Se o endereço estiver cadastrado em nossa base, você receberá o link para criar sua nova senha em instantes.
                  </div>
                  <button
                    onClick={handleBackToLogin}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center cursor-pointer select-none"
                  >
                    Voltar para o Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      E-mail de Cadastro
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="seuemail@exemplo.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer select-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Solicitar Recuperação'
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-0 cursor-pointer"
                      disabled={loading}
                    >
                      Voltar para o Login
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
