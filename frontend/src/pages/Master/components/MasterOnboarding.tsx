import React, { useState } from 'react';
import { api } from '../../../services/api';
import {
  UploadCloud,
  Download,
  Database,
  Play,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Terminal
} from 'lucide-react';

export const MasterOnboarding: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const downloadExcelTemplate = () => {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <table border="1">
          <tr style="background-color: #3b82f6; color: #ffffff; font-weight: bold;">
            <th>CNPJ</th>
            <th>Razão Social</th>
            <th>Nome Fantasia</th>
            <th>Nome do Responsável</th>
            <th>Contato do Responsável</th>
          </tr>
          <tr>
            <td>12345678000190</td>
            <td>Empresa de Exemplo LTDA</td>
            <td>Exemplo Co</td>
            <td>Randy Gomes</td>
            <td>5527998349791</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_onboarding_setoriza.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setLogs([]);
      setProgress(0);
      setSuccessCount(0);
      setErrorCount(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile);
        setLogs([]);
        setProgress(0);
        setSuccessCount(0);
        setErrorCount(0);
      }
    }
  };

  const parseExcelHtml = (text: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const rows = doc.querySelectorAll('tr');
    const clients: Array<{
      cnpj: string;
      companyName: string;
      tradeName: string;
      contactName: string;
      whatsappNumber: string;
    }> = [];

    rows.forEach((row, idx) => {
      if (idx === 0) return; // skip header
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const cnpj = cells[0]?.textContent?.trim() || '';
        const companyName = cells[1]?.textContent?.trim() || '';
        const tradeName = cells[2]?.textContent?.trim() || '';
        const contactName = cells[3]?.textContent?.trim() || '';
        const whatsappNumber = cells[4]?.textContent?.trim() || '';

        if (cnpj && companyName && contactName && whatsappNumber) {
          clients.push({
            cnpj,
            companyName,
            tradeName: tradeName || companyName,
            contactName,
            whatsappNumber
          });
        }
      }
    });

    return clients;
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const clients: Array<{
      cnpj: string;
      companyName: string;
      tradeName: string;
      contactName: string;
      whatsappNumber: string;
    }> = [];

    lines.forEach((line, idx) => {
      if (idx === 0) return; // skip header
      const separator = line.includes(';') ? ';' : ',';
      const cells = line.split(separator).map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (cells.length >= 4) {
        const cnpj = cells[0] || '';
        const companyName = cells[1] || '';
        const tradeName = cells[2] || '';
        const contactName = cells[3] || '';
        const whatsappNumber = cells[4] || '';

        if (cnpj && companyName && contactName && whatsappNumber) {
          clients.push({
            cnpj,
            companyName,
            tradeName: tradeName || companyName,
            contactName,
            whatsappNumber
          });
        }
      }
    });

    return clients;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setLogs([]);
    addLog(`Iniciando leitura do arquivo: ${file.name}`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        let clientsToImport: Array<any> = [];

        if (file.name.endsWith('.csv')) {
          clientsToImport = parseCSV(text);
        } else {
          clientsToImport = parseExcelHtml(text);
        }

        if (clientsToImport.length === 0) {
          addLog("Nenhum cliente válido localizado no arquivo. Verifique se o arquivo segue o modelo padrão.");
          setImporting(false);
          return;
        }

        setTotalRows(clientsToImport.length);
        addLog(`Total de registros identificados para importação: ${clientsToImport.length}`);

        // 1. Carregar lista de clientes existentes para evitar duplicidade de CNPJ
        addLog("Consultando lista de empresas já cadastradas no backend...");
        let existingClients: any[] = [];
        try {
          existingClients = await api.clients.list();
        } catch (err) {
          addLog("Aviso: Não foi possível carregar a lista de empresas existentes. Prosseguindo...");
        }

        const cnpjMap = new Map<string, string>();
        existingClients.forEach(c => cnpjMap.set(c.cnpj.replace(/\D/g, ''), c.id));

        let currentSuccess = 0;
        let currentError = 0;

        // 2. Loop de importação sequencial
        for (let i = 0; i < clientsToImport.length; i++) {
          const client = clientsToImport[i];
          const cleanCnpj = client.cnpj.replace(/\D/g, '');
          let clientId = cnpjMap.get(cleanCnpj);

          addLog(`[${i + 1}/${clientsToImport.length}] Processando: CNPJ ${client.cnpj} | ${client.tradeName}`);

          if (!clientId) {
            try {
              const created = await api.clients.create({
                cnpj: cleanCnpj,
                companyName: client.companyName,
                tradeName: client.tradeName
              });
              clientId = created.id;
              addLog(`[Empresa OK] "${client.tradeName}" cadastrada com ID: ${created.id.substring(0, 8)}...`);
            } catch (err: any) {
              addLog(`[Erro Empresa] Falha ao cadastrar "${client.tradeName}": ${err.message || 'Erro Interno'}`);
              currentError++;
              setErrorCount(currentError);
              setProgress(i + 1);
              continue;
            }
          } else {
            addLog(`[Info Empresa] Empresa "${client.tradeName}" já está cadastrada.`);
          }

          // Vincular o contato do responsável
          try {
            const cleanPhone = client.whatsappNumber.replace(/\D/g, '');
            await api.clients.addContact(clientId!, {
              whatsappNumber: cleanPhone,
              contactName: client.contactName
            });
            addLog(`[Contato OK] Responsável "${client.contactName}" (${client.whatsappNumber}) vinculado.`);
            currentSuccess++;
            setSuccessCount(currentSuccess);
          } catch (err: any) {
            addLog(`[Contato Aviso] Responsável "${client.contactName}" não pôde ser vinculado (pode já estar cadastrado).`);
            // Ainda consideramos sucesso pois a empresa já foi resolvida ou criada
            currentSuccess++;
            setSuccessCount(currentSuccess);
          }

          setProgress(i + 1);
          // Atraso de 100ms para efeito visual e evitar sobrecarga na API
          await new Promise(r => setTimeout(r, 100));
        }

        addLog("=========================================");
        addLog(`IMPORTAÇÃO FINALIZADA!`);
        addLog(`Sucessos: ${currentSuccess} | Erros/Falhas: ${currentError}`);
        addLog("=========================================");

      } catch (err: any) {
        addLog(`Erro crítico durante processamento: ${err.message || err}`);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  const handleCancel = () => {
    setFile(null);
    setLogs([]);
    setProgress(0);
    setSuccessCount(0);
    setErrorCount(0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-slate-855 dark:text-slate-100 flex items-center gap-2">
          <UploadCloud size={22} className="text-blue-500" />
          Carga de Dados & Onboarding de Clientes
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Importe a listagem de clientes ativos dos escritórios de contabilidade diretamente para o sistema de forma automatizada.
        </p>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-6">
        
        {/* Download Template Card */}
        {!importing && (
          <div className="p-5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">Planilha de Modelo Padrão (Excel)</h3>
              <p className="text-xs text-blue-700/85 dark:text-blue-400/80">
                Faça o download do arquivo modelo pre-formatado, preencha com as informações dos clientes e envie ao lado.
              </p>
            </div>
            <button
              onClick={downloadExcelTemplate}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Download size={14} />
              Baixar Modelo Excel
            </button>
          </div>
        )}

        {/* Upload Zone & Actions */}
        {!importing && !file ? (
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl p-10 flex flex-col items-center justify-center space-y-4 hover:border-blue-500 transition-colors cursor-pointer"
          >
            <input 
              type="file" 
              id="file-input" 
              accept=".xls,.csv" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <div className="p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
              <UploadCloud size={32} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-855 dark:text-slate-200">Arraste seu arquivo Excel/CSV preenchido ou clique para navegar</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Extensões permitidas: .xls, .csv | Tamanho máximo: 5MB</p>
            </div>
          </div>
        ) : !importing && file ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Database size={24} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{file.name}</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="py-2 px-3 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={12} />
                Iniciar Importação
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-750 dark:text-slate-200 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                Importando registros: {progress} de {totalRows}
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {Math.round((progress / totalRows) * 100)}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-150"
                style={{ width: `${(progress / totalRows) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-2.5">
                <CheckCircle size={16} className="text-emerald-500" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sucessos</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{successCount}</p>
                </div>
              </div>
              <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-rose-500" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Erros</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{errorCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Console Logs Display */}
        {(logs.length > 0 || importing) && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Terminal size={14} />
              Console de Importação
            </h3>
            <div className="w-full h-48 bg-slate-955 border border-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 dark:text-emerald-400 overflow-y-auto space-y-1 scroll-smooth">
              {logs.map((log, idx) => (
                <div key={idx} className={
                  log.includes('[Erro') ? 'text-red-400' : 
                  log.includes('[Info') ? 'text-blue-400' :
                  log.includes('[Contato') ? 'text-cyan-400' : 'text-emerald-400'
                }>
                  {log}
                </div>
              ))}
              {importing && (
                <div className="text-slate-500 animate-pulse">_</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
