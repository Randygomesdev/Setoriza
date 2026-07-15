import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';

interface AdminIntegrationsProps {
  setError: (err: string | null) => void;
}

export const AdminIntegrations: React.FC<AdminIntegrationsProps> = ({
  setError
}) => {
  const [evoStatus, setEvoStatus] = useState<'OFFLINE' | 'CONNECTED' | 'DISCONNECTED' | 'LOADING'>('LOADING');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [evoSuccessMsg, setEvoSuccessMsg] = useState('');
  
  const [evoConfig, setEvoConfig] = useState({
    baseUrl: 'http://localhost:8080',
    instanceName: 'setoriza-dev',
    apiKey: 'apikey-key-password-123',
  });

  const checkEvoStatus = async () => {
    setEvoStatus('LOADING');
    try {
      const res = await api.integration.getStatus();
      if (res && res.instance && res.instance.state === 'open') {
        setEvoStatus('CONNECTED');
        setQrCodeBase64(null);
        if (res.configuredInstanceName) {
          setEvoConfig(prev => ({ ...prev, instanceName: res.configuredInstanceName }));
        }
      } else if (res && res.instance && res.instance.state === 'OFFLINE') {
        setEvoStatus('OFFLINE');
      } else {
        setEvoStatus('DISCONNECTED');
      }
    } catch {
      setEvoStatus('OFFLINE');
    }
  };

  const handleCreateEvoInstance = async () => {
    setError(null);
    setEvoSuccessMsg('');
    try {
      await api.integration.createInstance();
      setEvoSuccessMsg('Instância criada com sucesso! Carregando QR Code...');
      await checkEvoStatus();
      await handleLoadQrCode();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar instância na Evolution API');
    }
  };

  const handleLoadQrCode = async () => {
    setQrLoading(true);
    setError(null);
    try {
      const res = await api.integration.getQrCode();
      if (res && res.base64) {
        setQrCodeBase64(res.base64);
      } else {
        setError('Não foi possível obter a imagem do QR Code. Verifique se a instância está iniciada.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar QR Code');
    } finally {
      setQrLoading(false);
    }
  };

  const handleLogoutEvoInstance = async () => {
    if (!confirm('Deseja realmente desconectar este WhatsApp? Isso encerrará a sessão activa.')) return;
    setError(null);
    try {
      await api.integration.logout();
      setEvoSuccessMsg('Instância desconectada com sucesso.');
      setQrCodeBase64(null);
      await checkEvoStatus();
    } catch (err: any) {
      setError(err.message || 'Erro ao desconectar instância');
    }
  };

  useEffect(() => {
    let intervalId: any = null;
    if (evoStatus === 'DISCONNECTED') {
      intervalId = setInterval(async () => {
        try {
          const res = await api.integration.getStatus();
          if (res && res.instance && res.instance.state === 'open') {
            setEvoStatus('CONNECTED');
            setQrCodeBase64(null);
          }
        } catch {
          // ignore
        }
      }, 4000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [evoStatus]);

  useEffect(() => {
    checkEvoStatus();
    const savedConfig = localStorage.getItem('evolution_api_config');
    if (savedConfig) {
      try {
        setEvoConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error loading saved config', e);
      }
    }
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gerenciador de Conectores do WhatsApp</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Crie instâncias e faça a autenticação do robô leitor do WhatsApp escaneando o QR Code abaixo.
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          {evoSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-400">
              {evoSuccessMsg}
            </div>
          )}

          {evoStatus === 'LOADING' && (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500 text-xs gap-2">
              <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Verificando estado do conector do WhatsApp...</span>
            </div>
          )}

          {evoStatus === 'CONNECTED' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-955/25 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-start gap-3">
                <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Aparelho Conectado e Ativo!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    O robô de atendimento está pareado com sucesso e processando mensagens recebidas em tempo real.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Nome da Instância:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{evoConfig.instanceName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Status Operacional:</span>
                  <span className="font-bold text-emerald-500">CONECTADO</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLogoutEvoInstance}
                  className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Desconectar Aparelho (Logout)
                </button>
              </div>
            </div>
          )}

          {evoStatus === 'DISCONNECTED' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-955/25 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Aparelho Desconectado</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    A instância existe, mas o WhatsApp não está pareado. Você precisa escanear o QR Code abaixo com o aplicativo do WhatsApp no celular de atendimento.
                  </p>
                </div>
              </div>

              {qrCodeBase64 ? (
                <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-4 max-w-sm mx-auto">
                  <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 text-center uppercase tracking-wide">Escaneie o QR Code</h4>
                  <img 
                    src={qrCodeBase64} 
                    alt="WhatsApp QR Code" 
                    className="h-56 w-56 border-4 border-white bg-white rounded-lg shadow-md"
                  />
                  <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                    Abra o WhatsApp no celular &gt; Menu &gt; Aparelhos Conectados &gt; Conectar Aparelho.
                  </p>
                  <button
                    onClick={handleLoadQrCode}
                    disabled={qrLoading}
                    className="py-1 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    {qrLoading ? 'Atualizando...' : 'Atualizar QR Code'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <button
                    onClick={handleLoadQrCode}
                    disabled={qrLoading}
                    className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {qrLoading ? 'Carregando...' : 'Gerar QR Code de Conexão'}
                  </button>
                </div>
              )}
            </div>
          )}

          {evoStatus === 'OFFLINE' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Robô Indisponível / Instância Inexistente</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Não conseguimos detectar uma conexão ativa com a Evolution API. É possível que a instância do robô ainda não tenha sido criada no servidor local.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleCreateEvoInstance}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                >
                  <Plus size={14} />
                  Instanciar Robô (Criar Instância "{evoConfig.instanceName}")
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Status and instructions */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Status do Servidor</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configuração de rede e Webhooks.</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${evoStatus === 'OFFLINE' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse shrink-0`}></span>
            <div>
              <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                {evoStatus === 'OFFLINE' ? 'API Inalcançável' : 'Conector Online'}
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">API: {evoConfig.baseUrl}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
