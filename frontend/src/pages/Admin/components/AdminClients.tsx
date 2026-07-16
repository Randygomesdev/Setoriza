import React, { useState } from 'react';
import { Plus, X, Briefcase, Phone, Trash2 } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCNPJ, formatPhone, formatPhoneOnly, formatPhoneNumber } from '../utils/adminHelpers';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

interface AdminClientsProps {
  clientsList: any[];
  onRefresh: () => Promise<void>;
  setError: (err: string | null) => void;
}

export const AdminClients: React.FC<AdminClientsProps> = ({
  clientsList,
  onRefresh,
  setError
}) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [searchClient, setSearchClient] = useState('');
  const [isClientDrawerOpen, setIsClientDrawerOpen] = useState(false);
  const [clientSuccessMsg, setClientSuccessMsg] = useState('');
  const [editingClient, setEditingClient] = useState<any | null>(null);
  
  const [newClient, setNewClient] = useState({
    companyName: '',
    cnpj: '',
    initialContactName: '',
    initialWhatsappNumber: '',
  });

  const [tempContacts, setTempContacts] = useState<{ contactName: string; whatsappNumber: string }[]>([]);
  const [isAddingContactInline, setIsAddingContactInline] = useState(false);
  const [inlineContact, setInlineContact] = useState({ contactName: '', ddi: '55', whatsappNumber: '' });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientSuccessMsg('');
    setError(null);
    try {
      const cleanCnpj = newClient.cnpj.replace(/\D/g, '');
      const created = await api.clients.create({
        companyName: newClient.companyName,
        cnpj: cleanCnpj,
      });

      for (const tc of tempContacts) {
        const cleanPhone = tc.whatsappNumber.replace(/\D/g, '');
        await api.clients.addContact(created.id, {
          whatsappNumber: cleanPhone,
          contactName: tc.contactName,
        });
      }

      setClientSuccessMsg('Cliente cadastrado com sucesso!');
      setNewClient({
        companyName: '',
        cnpj: '',
        initialContactName: '',
        initialWhatsappNumber: '',
      });
      setTempContacts([]);
      setIsAddingContactInline(false);
      setInlineContact({ contactName: '', ddi: '55', whatsappNumber: '' });
      await onRefresh();
      setTimeout(() => {
        setIsClientDrawerOpen(false);
        setClientSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar cliente');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientSuccessMsg('');
    setError(null);
    if (!editingClient) return;
    try {
      const cleanCnpj = editingClient.cnpj.replace(/\D/g, '');
      await api.clients.update(editingClient.id, {
        companyName: editingClient.companyName,
        cnpj: cleanCnpj,
      });
      setClientSuccessMsg('Cadastro do cliente atualizado com sucesso!');
      await onRefresh();
      setTimeout(() => {
        setIsClientDrawerOpen(false);
        setEditingClient(null);
        setClientSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar cliente');
    }
  };

  const handleDeleteClient = async (id: string) => {
    const confirmed = await confirm({
      title: 'Remover Cliente',
      message: 'Deseja realmente remover este cliente? Todos os contatos vinculados serão impactados.',
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;
    setError(null);
    try {
      await api.clients.delete(id);
      await onRefresh();
      addToast({ type: 'success', title: 'Cliente Removido', message: 'Cliente corporativo removido com sucesso!' });
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao deletar cliente';
      setError(errMsg);
      addToast({ type: 'error', title: 'Erro ao remover', message: errMsg });
    }
  };

  const handleAddTempContact = () => {
    if (!inlineContact.contactName || !inlineContact.whatsappNumber) return;
    const cleanPhone = inlineContact.ddi + inlineContact.whatsappNumber.replace(/\D/g, '');
    setTempContacts([...tempContacts, {
      contactName: inlineContact.contactName,
      whatsappNumber: cleanPhone
    }]);
    setInlineContact({ contactName: '', ddi: '55', whatsappNumber: '' });
    setIsAddingContactInline(false);
  };

  const handleRemoveTempContact = (index: number) => {
    setTempContacts(tempContacts.filter((_, idx) => idx !== index));
  };

  const handleAddContactToExisting = async () => {
    if (!editingClient || !inlineContact.contactName || !inlineContact.whatsappNumber) return;
    setError(null);
    try {
      const cleanPhone = inlineContact.ddi + inlineContact.whatsappNumber.replace(/\D/g, '');
      await api.clients.addContact(editingClient.id, {
        whatsappNumber: cleanPhone,
        contactName: inlineContact.contactName
      });
      setInlineContact({ contactName: '', ddi: '55', whatsappNumber: '' });
      setIsAddingContactInline(false);
      
      const res = await api.clients.list();
      const updated = res.find((x: any) => x.id === editingClient.id);
      if (updated) setEditingClient(updated);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar contato');
    }
  };

  const handleRemoveContactFromExisting = async (contactId: string) => {
    if (!editingClient) return;
    const confirmed = await confirm({
      title: 'Remover Contato',
      message: 'Deseja realmente remover este número de contato do cliente?',
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;
    setError(null);
    try {
      await api.clients.deleteContact(editingClient.id, contactId);
      const res = await api.clients.list();
      const updated = res.find((x: any) => x.id === editingClient.id);
      if (updated) setEditingClient(updated);
      await onRefresh();
      addToast({ type: 'success', title: 'Contato Removido', message: 'Contato removido com sucesso!' });
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao remover contato';
      setError(errMsg);
      addToast({ type: 'error', title: 'Erro ao remover', message: errMsg });
    }
  };

  const filteredClients = clientsList.filter((client) => {
    const q = searchClient.replace(/\D/g, '');
    const textQuery = searchClient.toLowerCase();
    return (
      client.companyName.toLowerCase().includes(textQuery) ||
      client.cnpj.replace(/\D/g, '').includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Clientes Corporativos</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gerencie as empresas e múltiplos números de contato de Whatsapp vinculados.</p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setTempContacts([]);
            setClientSuccessMsg('');
            setIsClientDrawerOpen(true);
          }}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={15} />
          Novo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Pesquisar por razão social ou CNPJ..."
          value={searchClient}
          onChange={(e) => setSearchClient(e.target.value)}
          className="w-full md:w-80 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Clients Table (Desktop only) */}
      <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Razão Social</th>
                <th className="px-6 py-3.5">CNPJ</th>
                <th className="px-6 py-3.5">Canais Associados</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center uppercase">
                      {client.companyName.slice(0, 2)}
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{client.companyName}</span>
                  </td>
                  <td className="px-6 py-4 font-mono">{formatCNPJ(client.cnpj)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 max-w-[240px]">
                      {client.contacts && client.contacts.length > 0 ? (
                        client.contacts.map((c: any) => (
                          <div key={c.id} className="flex items-center gap-1.5 text-[10px] bg-slate-55 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-800">
                            <span className="font-medium text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{c.contactName}:</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">{formatPhoneNumber(c.whatsappNumber)}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Nenhum canal associado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3.5">
                    <button
                      onClick={() => {
                        setEditingClient(client);
                        setClientSuccessMsg('');
                        setIsClientDrawerOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-500 font-bold hover:underline transition-all"
                    >
                      Gerenciar
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-xs text-rose-600 hover:text-rose-500 font-bold hover:underline transition-all"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500">
                    {searchClient ? 'Nenhum cliente corporativo encontrado para esta busca.' : 'Nenhum cliente cadastrado no banco.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clients Cards (Mobile only) */}
      <div className="block md:hidden space-y-4">
        {filteredClients.map((client) => (
          <div 
            key={client.id}
            className="p-5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4"
          >
            {/* Top section: initials and company name */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center uppercase shadow-sm">
                  {client.companyName.slice(0, 2)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-805 dark:text-slate-100 text-sm truncate max-w-[200px]" title={client.companyName}>
                    {client.companyName}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    {formatCNPJ(client.cnpj)}
                  </p>
                </div>
              </div>
            </div>

            {/* Channels / Associated Contacts */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Canais Associados</span>
              <div className="flex flex-col gap-1.5">
                {client.contacts && client.contacts.length > 0 ? (
                  client.contacts.map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-350">{c.contactName}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400">{formatPhoneNumber(c.whatsappNumber)}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Nenhum canal associado</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingClient(client);
                  setClientSuccessMsg('');
                  setIsClientDrawerOpen(true);
                }}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-blue-600 dark:text-blue-400 font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Gerenciar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClient(client.id)}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-rose-600 dark:text-rose-455 font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
        {filteredClients.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-xs bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl">
            {searchClient ? 'Nenhum cliente corporativo encontrado para esta busca.' : 'Nenhum cliente cadastrado no banco.'}
          </div>
        )}
      </div>

      {/* Sliding Drawer for Clients */}
      {isClientDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
          onClick={() => setIsClientDrawerOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-y-auto flex flex-col space-y-4 animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={16} className="text-blue-500" />
                {editingClient ? 'Gerenciar Cliente' : 'Novo Cliente Corporativo'}
              </h3>
              <button 
                onClick={() => setIsClientDrawerOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-455 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {clientSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-450">
                {clientSuccessMsg}
              </div>
            )}

            <form onSubmit={editingClient ? handleUpdateClient : handleCreateClient} className="space-y-4 flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Razão Social</label>
                <input 
                  type="text"
                  required
                  value={editingClient ? editingClient.companyName : newClient.companyName}
                  onChange={(e) => {
                    if (editingClient) setEditingClient({ ...editingClient, companyName: e.target.value });
                    else setNewClient({ ...newClient, companyName: e.target.value });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nome da empresa"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">CNPJ</label>
                <input 
                  type="text"
                  required
                  maxLength={18}
                  value={editingClient ? formatCNPJ(editingClient.cnpj) : formatCNPJ(newClient.cnpj)}
                  onChange={(e) => {
                    if (editingClient) setEditingClient({ ...editingClient, cnpj: e.target.value });
                    else setNewClient({ ...newClient, cnpj: e.target.value });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              {/* Contacts Management Section inside Drawer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Phone size={11} />
                    Contatos de Whatsapp
                  </label>
                  {!isAddingContactInline && (
                    <button
                      type="button"
                      onClick={() => setIsAddingContactInline(true)}
                      className="text-[9px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-0.5 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    >
                      + Add Número
                    </button>
                  )}
                </div>

                {isAddingContactInline && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Nome do Contato</label>
                      <input 
                        type="text"
                        value={inlineContact.contactName}
                        onChange={(e) => setInlineContact({ ...inlineContact, contactName: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-805 dark:text-slate-200 focus:outline-none"
                        placeholder="Ex: Comercial, Suporte, etc."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Whatsapp (Com DDD)</label>
                      <div className="flex gap-1.5">
                        <select
                          value={inlineContact.ddi}
                          onChange={(e) => setInlineContact({ ...inlineContact, ddi: e.target.value })}
                          className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <option value="55">+55 (BR)</option>
                          <option value="1">+1 (US)</option>
                        </select>
                        <input 
                          type="text"
                          value={formatPhoneOnly(inlineContact.whatsappNumber)}
                          onChange={(e) => setInlineContact({ ...inlineContact, whatsappNumber: e.target.value })}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingContactInline(false)}
                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-[10px] rounded font-bold hover:bg-slate-300 text-slate-600 dark:text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={editingClient ? handleAddContactToExisting : handleAddTempContact}
                        className="px-2.5 py-1 bg-blue-600 text-[10px] text-white rounded font-bold hover:bg-blue-500"
                      >
                        Salvar Número
                      </button>
                    </div>
                  </div>
                )}

                {/* Contacts List representation */}
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {editingClient && editingClient.contacts && editingClient.contacts.map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center p-2.5 bg-slate-55/60 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                      <div>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-250">{c.contactName}</span>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{formatPhone(c.whatsappNumber)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContactFromExisting(c.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Deletar Número"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {!editingClient && tempContacts.map((tc, index) => (
                    <div key={index} className="flex justify-between items-center p-2.5 bg-slate-55/60 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                      <div>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-250">{tc.contactName}</span>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{formatPhone(tc.whatsappNumber)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTempContact(index)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Deletar Número"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {((editingClient && (!editingClient.contacts || editingClient.contacts.length === 0)) || (!editingClient && tempContacts.length === 0)) && (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">
                      Nenhum número de telefone associado.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsClientDrawerOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-750 transition-all select-none cursor-pointer"
                >
                  {editingClient ? 'Fechar' : 'Cancelar'}
                </button>
                {!editingClient && (
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1 select-none cursor-pointer"
                  >
                    Cadastrar
                  </button>
                )}
                {editingClient && (
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1 select-none cursor-pointer"
                  >
                    Salvar Dados
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
