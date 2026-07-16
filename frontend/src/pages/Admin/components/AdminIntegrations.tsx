import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

interface AdminIntegrationsProps {
  setError: (err: string | null) => void;
}

export const AdminIntegrations: React.FC<AdminIntegrationsProps> = ({
  setError
}) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [evoStatus, setEvoStatus] = useState<'OFFLINE' | 'CONNECTED' | 'DISCONNECTED' | 'LOADING'>('LOADING');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [evoSuccessMsg, setEvoSuccessMsg] = useState('');
  
  const [evoConfig, setEvoConfig] = useState({
    baseUrl: 'http://localhost:8080',
    instanceName: 'setoriza-dev',
    apiKey: 'apikey-key-password-123',
  });

  const [activeConfig, setActiveConfig] = useState({
    apiType: 'EVOLUTION',
    metaPhoneNumberId: '',
    metaAccessToken: '',
    metaWabaId: '',
    metaVerifyToken: ''
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [metaStatus, setMetaStatus] = useState<'UNCONFIGURED' | 'CONFIGURED' | 'VALID' | 'INVALID'>('UNCONFIGURED');
  const [metaTesting, setMetaTesting] = useState(false);

  const loadConfig = async () => {
    try {
      const res = await api.integration.getConfig();
      if (res) {
        setActiveConfig({
          apiType: res.apiType || 'EVOLUTION',
          metaPhoneNumberId: res.metaPhoneNumberId || '',
          metaAccessToken: res.metaAccessToken || '',
          metaWabaId: res.metaWabaId || '',
          metaVerifyToken: res.metaVerifyToken || ''
        });
        
        if (res.metaPhoneNumberId && res.metaAccessToken) {
          setMetaStatus('CONFIGURED');
        } else {
          setMetaStatus('UNCONFIGURED');
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações do WhatsApp', err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setError(null);
    try {
      await api.integration.updateConfig(activeConfig);
      addToast({
        type: 'success',
        title: 'Configurações Salvas',
        message: 'A integração de WhatsApp do sistema foi atualizada com sucesso!'
      });
      if (activeConfig.metaPhoneNumberId && activeConfig.metaAccessToken) {
        setMetaStatus('CONFIGURED');
      } else {
        setMetaStatus('UNCONFIGURED');
      }
      if (activeConfig.apiType === 'EVOLUTION') {
        checkEvoStatus();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações do WhatsApp');
      addToast({
        type: 'error',
        title: 'Erro ao Salvar',
        message: err.message || 'Erro ao salvar configurações do WhatsApp'
      });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTestMetaConnection = async () => {
    setMetaTesting(true);
    setError(null);
    try {
      const res = await api.integration.testMeta();
      if (res && res.success) {
        setMetaStatus('VALID');
        addToast({
          type: 'success',
          title: 'Meta API Conectada',
          message: 'As credenciais foram validadas com sucesso junto ao Facebook!'
        });
      } else {
        setMetaStatus('INVALID');
        const errorMsg = res.message || 'Falha na validação com a Meta API.';
        setError(errorMsg);
        addToast({
          type: 'error',
          title: 'Erro de Autenticação',
          message: errorMsg
        });
      }
    } catch (err: any) {
      setMetaStatus('INVALID');
      const errorMsg = err.message || 'Erro ao conectar à Meta API.';
      setError(errorMsg);
      addToast({
        type: 'error',
        title: 'Erro de Conexão',
        message: errorMsg
      });
    } finally {
      setMetaTesting(false);
    }
  };

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
    const confirmed = await confirm({
      title: 'Desconectar WhatsApp',
      message: 'Deseja realmente desconectar este WhatsApp? Isso encerrará a sessão activa.',
      confirmText: 'Desconectar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;
    setError(null);
    try {
      await api.integration.logout();
      setEvoSuccessMsg('Instância desconectada com sucesso.');
      setQrCodeBase64(null);
      await checkEvoStatus();
      addToast({ type: 'success', title: 'Instância Desconectada', message: 'WhatsApp desconectado com sucesso.' });
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao desconectar instância';
      setError(errMsg);
      addToast({ type: 'error', title: 'Erro ao desconectar', message: errMsg });
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
    loadConfig();
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

        <div className="p-5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
          
          {activeConfig.apiType === 'META' ? (
            <div className="space-y-6">
              {metaStatus === 'UNCONFIGURED' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Aguardando Configuração da Meta API</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      As credenciais do Facebook Business Manager ainda não foram cadastradas no sistema. Por favor, insira o Phone Number ID e o Access Token no painel lateral direito para ativar este canal.
                    </p>
                  </div>
                </div>
              )}

              {metaStatus === 'CONFIGURED' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-900/45 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Meta API Configurada (Aguardando Teste)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        As credenciais estão preenchidas. Recomendamos testar a conexão para certificar-se de que a comunicação com o Facebook está ativa e sem erros.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 text-center">
                    <button
                      onClick={handleTestMetaConnection}
                      disabled={metaTesting}
                      className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer select-none"
                    >
                      {metaTesting ? 'Testando Conexão...' : 'Testar Conexão com a Meta'}
                    </button>
                  </div>
                </div>
              )}

              {metaStatus === 'VALID' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-955/25 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-start gap-3">
                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">API Oficial da Meta Ativa e Validada!</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        O conector oficial está autenticado com sucesso e pronto para processar mensagens.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 text-center">
                    <button
                      onClick={handleTestMetaConnection}
                      disabled={metaTesting}
                      className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-all cursor-pointer select-none"
                    >
                      {metaTesting ? 'Testando...' : 'Testar Novamente'}
                    </button>
                  </div>
                </div>
              )}

              {metaStatus === 'INVALID' && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Falha de Autenticação na Meta API</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Não foi possível estabelecer contato com a Meta usando as credenciais informadas. Verifique o Access Token e o Phone Number ID e tente novamente.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 text-center">
                    <button
                      onClick={handleTestMetaConnection}
                      disabled={metaTesting}
                      className="py-2.5 px-6 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer select-none"
                    >
                      {metaTesting ? 'Testando...' : 'Re-testar Conexão'}
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">ID do Telefone (Meta):</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350">{activeConfig.metaPhoneNumberId || '[Não Configurado]'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">WABA ID:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350">{activeConfig.metaWabaId || '[Não Configurado]'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Token de Validação Webhook:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-350">{activeConfig.metaVerifyToken || '[Não Configurado]'}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                      <span className="font-semibold text-slate-700 dark:text-slate-350">{evoConfig.instanceName}</span>
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
            </>
          )}

        </div>
      </div>

      {/* Global Config Settings Panel */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Configurações Gerais</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Defina qual API de envio o escritório irá utilizar.</p>
        </div>

        <form onSubmit={handleSaveConfig} className="p-5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
          
          {/* Status do Conector (mostrado apenas se estiver no modo Evolution) */}
          {activeConfig.apiType === 'EVOLUTION' && (
            <div className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl">
              <span className={`h-3 w-3 rounded-full ${evoStatus === 'OFFLINE' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse shrink-0`}></span>
              <div>
                <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {evoStatus === 'OFFLINE' ? 'API Inalcançável' : 'Conector Online'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">API: {evoConfig.baseUrl}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Canal de Envio Ativo</label>
            <select
              value={activeConfig.apiType}
              onChange={(e) => setActiveConfig({ ...activeConfig, apiType: e.target.value })}
              className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none"
            >
              <option value="EVOLUTION">Evolution API (QR Code)</option>
              <option value="META">API Oficial da Meta (Cloud API)</option>
            </select>
          </div>

          {activeConfig.apiType === 'META' && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-850">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-400">Phone Number ID (ID do Telefone)</label>
                <input 
                  type="text"
                  required
                  value={activeConfig.metaPhoneNumberId}
                  onChange={(e) => setActiveConfig({ ...activeConfig, metaPhoneNumberId: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="Ex: 105826978432589"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-400">System Access Token (Token de Acesso)</label>
                <input 
                  type="password"
                  required
                  value={activeConfig.metaAccessToken}
                  onChange={(e) => setActiveConfig({ ...activeConfig, metaAccessToken: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="Ex: EAAGb3vfZC..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-400">WABA ID (ID da Conta Business)</label>
                <input 
                  type="text"
                  required
                  value={activeConfig.metaWabaId}
                  onChange={(e) => setActiveConfig({ ...activeConfig, metaWabaId: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="Ex: 109325684784269"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-400">Verify Token (Validação de Webhook)</label>
                <input 
                  type="text"
                  required
                  value={activeConfig.metaVerifyToken}
                  onChange={(e) => setActiveConfig({ ...activeConfig, metaVerifyToken: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="Ex: meu_token_secreto_webhook"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={configSaving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/60 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center select-none"
            >
              {configSaving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
