import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Key, 
  Brain, 
  Cpu, 
  MessageSquare, 
  Eye, 
  EyeOff, 
  Check, 
  HelpCircle,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { api } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';

export const AdminAI: React.FC = () => {
  const { addToast } = useToast();
  
  const [config, setConfig] = useState({
    id: '00000000-0000-0000-0000-000000000002',
    aiEnabled: false,
    autoTriageEnabled: false,
    chatbotEnabled: false,
    geminiApiKey: '',
    systemPrompt: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadAiConfig();
  }, []);

  const loadAiConfig = async () => {
    setLoading(true);
    try {
      const data = await api.ai.getConfig();
      if (data) {
        setConfig({
          ...data,
          geminiApiKey: data.geminiApiKey || ''
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: err.message || 'Não foi possível carregar as configurações de IA.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    // Validações básicas
    if (config.aiEnabled && (!config.geminiApiKey || config.geminiApiKey.trim() === '')) {
      addToast({
        type: 'error',
        title: 'Chave obrigatória',
        message: 'Para ativar a Inteligência Artificial, informe a chave da API do Gemini.'
      });
      setSaving(false);
      return;
    }

    try {
      const updated = await api.ai.updateConfig(config);
      if (updated) {
        setConfig({
          ...updated,
          geminiApiKey: updated.geminiApiKey || ''
        });
        addToast({
          type: 'success',
          title: 'Configurações Salvas',
          message: 'Configurações de Inteligência Artificial salvas com sucesso!'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        message: err.message || 'Falha ao gravar as configurações de IA.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const data = await api.ai.testConnection() as any;
      const response = data?.result || '';
      setTestResult(response);
      
      if (response && !response.toLowerCase().includes('falha') && !response.toLowerCase().includes('ausente')) {
        addToast({
          type: 'success',
          title: 'Conexão Estabelecida',
          message: 'A API do Google Gemini respondeu com sucesso!'
        });
      } else {
        addToast({
          type: 'error',
          title: 'Falha no Teste',
          message: response || 'Ocorreu um erro ao receber a resposta do Gemini.'
        });
      }
    } catch (err: any) {
      setTestResult(`Erro de Comunicação:\n${err.message}`);
      addToast({
        type: 'error',
        title: 'Erro de Conexão',
        message: err.message || 'Falha ao testar chave com o Gemini.'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-8 w-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando configurações de IA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <Brain size={22} className="text-blue-500" />
            Inteligência Artificial (AI Chatbot)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure a integração com o Google Gemini para habilitar triagem de setores por linguagem natural e chatbot de conversação autônomo.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Chave de API e Ativação Geral */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Key size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Credenciais & Ativação</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Insira sua chave de acesso da API do Google AI (Gemini).</p>
              </div>
            </div>

            {/* Switch Principal */}
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={config.aiEnabled}
                onChange={(e) => setConfig({ ...config, aiEnabled: e.target.checked })}
              />
              <div className="w-10 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
              <span className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-350">
                {config.aiEnabled ? 'Ativo' : 'Inativo'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-850/60">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                Gemini API Key
                <span className="text-[9px] lowercase font-normal text-slate-450 normal-case">(Obtido em ai.google.dev)</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.geminiApiKey}
                  onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  disabled={!config.aiEnabled && config.geminiApiKey === ''}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Validação</label>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !config.geminiApiKey}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-750 transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <RefreshCw size={14} className="animate-spin text-blue-500" />
                ) : (
                  <Terminal size={14} className="text-emerald-500" />
                )}
                Testar Conexão
              </button>
            </div>
          </div>

          {/* Console de Resposta do Gemini */}
          {testResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 text-slate-350 border border-slate-800 font-mono text-[10px] space-y-1 animate-in fade-in duration-200 shadow-inner">
              <div className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase tracking-wider mb-2">
                <Terminal size={12} />
                <span>Console de Resposta da API</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{testResult}</p>
            </div>
          )}
        </div>

        {/* Card 2: Módulos Inteligentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Triagem Inteligente */}
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-2.5">
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide">Triagem por IA</h3>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">Direcionamento de fila via linguagem natural.</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={config.autoTriageEnabled}
                    disabled={!config.aiEnabled}
                    onChange={(e) => setConfig({ ...config, autoTriageEnabled: e.target.checked })}
                  />
                  <div className="w-8 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
                Quando ativo, a IA analisa a primeira mensagem do cliente e o encaminha **automaticamente** ao setor adequado (DP, Fiscal, Contábil, etc.). Caso a mensagem seja genérica (ex: saudações), o robô exibe o menu numérico tradicional de fallback.
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg mt-4 border border-slate-100 dark:border-slate-850/40">
              <HelpCircle size={12} className="text-blue-500" />
              <span>Simula um delay humano de 12 segundos para digitação.</span>
            </div>
          </div>

          {/* Atendente Virtual Autônomo */}
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide">Chatbot Autônomo</h3>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">Respostas automáticas na fila de espera.</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={config.chatbotEnabled}
                    disabled={!config.aiEnabled}
                    onChange={(e) => setConfig({ ...config, chatbotEnabled: e.target.checked })}
                  />
                  <div className="w-8 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 transition-colors"></div>
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
                Responde dúvidas frequentes dos clientes enquanto eles aguardam atendimento humano na fila. Utiliza a base de conhecimento configurada no prompt. Assim que um atendente **captura** o ticket, a IA se desliga automaticamente.
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg mt-4 border border-slate-100 dark:border-slate-850/40">
              <Check size={12} className="text-emerald-500" />
              <span>Desliga-se instantaneamente quando o operador assume o chat.</span>
            </div>
          </div>
        </div>

        {/* Card 3: Base de Conhecimento e Prompt */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Brain size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Base de Conhecimento (Instruções da IA)</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Escreva as regras de negócios, dúvidas frequentes e o comportamento esperado do assistente.</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850/60">
            <textarea
              rows={8}
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              placeholder="Você é o assistente virtual da nossa contabilidade. Nosso horário é de segunda a sexta, das 8h às 18h. Se perguntarem sobre preço de abertura de empresa, diga que custa R$ 500..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-800 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-sans resize-y"
              disabled={!config.aiEnabled}
            />
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-56 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-600/50 disabled:to-indigo-600/50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} className="animate-pulse" />
            )}
            {saving ? 'Gravando Dados...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
};
