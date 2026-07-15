import React, { useState } from 'react';
import { Plus, X, Settings, Users } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../services/api';

interface AdminUsersProps {
  usersList: any[];
  sectorsList: any[];
  onRefresh: () => Promise<void>;
  setError: (err: string | null) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({
  usersList,
  sectorsList,
  onRefresh,
  setError
}) => {
  const { user: currentUser } = useAuthStore();
  const [searchUser, setSearchUser] = useState('');
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [userSuccessMsg, setUserSuccessMsg] = useState('');
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    sectors: '',
  });
  
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMsg('');
    setError(null);
    try {
      await api.users.create(newUser);
      setUserSuccessMsg('Usuário criado com sucesso!');
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        sectors: '',
      });
      await onRefresh();
      setTimeout(() => {
        setIsUserDrawerOpen(false);
        setUserSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMsg('');
    setError(null);
    if (!editingUser) return;
    try {
      await api.users.update(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        sectors: editingUser.sectors,
      });
      setUserSuccessMsg('Colaborador atualizado com sucesso!');
      await onRefresh();
      setTimeout(() => {
        setIsUserDrawerOpen(false);
        setEditingUser(null);
        setUserSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar colaborador');
    }
  };

  const filteredUsers = usersList.filter((usr) => {
    const q = searchUser.toLowerCase();
    return (
      usr.name.toLowerCase().includes(q) ||
      usr.email.toLowerCase().includes(q) ||
      (usr.sectors && usr.sectors.toLowerCase().includes(q))
    );
  });

  const toggleSectorSelection = (sectorName: string, isEditing: boolean) => {
    if (isEditing && editingUser) {
      const currentSectors = editingUser.sectors
        ? editingUser.sectors.split(',').map((s: string) => s.trim().toUpperCase())
        : [];
      const uppercaseName = sectorName.toUpperCase();
      let nextSectors: string[];
      if (currentSectors.includes(uppercaseName)) {
        nextSectors = currentSectors.filter((s: string) => s !== uppercaseName);
      } else {
        nextSectors = [...currentSectors, uppercaseName];
      }
      setEditingUser({ ...editingUser, sectors: nextSectors.join(',') });
    } else {
      const currentSectors = newUser.sectors
        ? newUser.sectors.split(',').map((s: string) => s.trim().toUpperCase())
        : [];
      const uppercaseName = sectorName.toUpperCase();
      let nextSectors: string[];
      if (currentSectors.includes(uppercaseName)) {
        nextSectors = currentSectors.filter((s: string) => s !== uppercaseName);
      } else {
        nextSectors = [...currentSectors, uppercaseName];
      }
      setNewUser({ ...newUser, sectors: nextSectors.join(',') });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Colaboradores</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gerencie a equipe de atendimento, permissões e setores de atuação.</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setUserSuccessMsg('');
            setIsUserDrawerOpen(true);
          }}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={15} />
          Novo Colaborador
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Pesquisar por nome, e-mail ou setor..."
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Operators Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredUsers.map((usr) => (
          <div 
            key={usr.id} 
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all space-y-4"
          >
            {/* Top section: Avatar, Access, and Name */}
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white font-extrabold flex items-center justify-center uppercase shadow-sm">
                  {usr.name.slice(0, 2)}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                  usr.role === 'MASTER'
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40'
                    : usr.role === 'ADMIN'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40'
                }`}>
                  {usr.role === 'MASTER' ? 'Master' : usr.role === 'ADMIN' ? 'Admin' : 'Operador'}
                </span>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate" title={usr.name}>
                  {usr.name}
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5" title={usr.email}>
                  {usr.email}
                </p>
              </div>
            </div>

            {/* Middle section: Linked Sectors */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Setores Vinculados</span>
              <div className="flex flex-wrap gap-1 min-h-[22px]">
                {usr.sectors ? (
                  usr.sectors.split(',').map((s: string) => {
                    const trimmed = s.trim();
                    if (!trimmed) return null;
                    return (
                      <span 
                        key={trimmed} 
                        className="text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/60"
                      >
                        {trimmed}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] italic">Sem setores</span>
                )}
              </div>
            </div>

            {/* Bottom section: Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
              {!(usr.role === 'MASTER' && currentUser?.role === 'ADMIN') ? (
                <button
                  onClick={() => {
                    setEditingUser({
                      id: usr.id,
                      name: usr.name,
                      email: usr.email,
                      role: usr.role,
                      sectors: usr.sectors || ''
                    });
                    setUserSuccessMsg('');
                    setIsUserDrawerOpen(true);
                  }}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-250 dark:border-slate-800 text-xs text-blue-600 dark:text-blue-400 font-bold rounded-xl transition-all text-center select-none cursor-pointer"
                >
                  Editar Colaborador
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 italic">Restrito</span>
              )}
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-500 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            {searchUser ? 'Nenhum colaborador encontrado para esta busca.' : 'Nenhum operador encontrado no banco.'}
          </div>
        )}
      </div>

      {/* Sliding Drawer for Users */}
      {isUserDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
          onClick={() => setIsUserDrawerOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-y-auto flex flex-col space-y-4 animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={16} className="text-blue-500" />
                {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button 
                onClick={() => setIsUserDrawerOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {userSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-450">
                {userSuccessMsg}
              </div>
            )}

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4 flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nome Completo</label>
                <input 
                  type="text"
                  required
                  value={editingUser ? editingUser.name : newUser.name}
                  onChange={(e) => {
                    if (editingUser) setEditingUser({ ...editingUser, name: e.target.value });
                    else setNewUser({ ...newUser, name: e.target.value });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nome do colaborador"
                />
              </div>

              {!editingUser && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">E-mail</label>
                    <input 
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="email@setoriza.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Senha</label>
                    <input 
                      type="password"
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Digite a senha"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nível de Acesso</label>
                <select
                  value={editingUser ? editingUser.role : newUser.role}
                  onChange={(e) => {
                    if (editingUser) setEditingUser({ ...editingUser, role: e.target.value });
                    else setNewUser({ ...newUser, role: e.target.value });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="USER">Operador (Atendente)</option>
                  <option value="ADMIN">Administrador</option>
                  {currentUser?.role === 'MASTER' && <option value="MASTER">Master</option>}
                </select>
              </div>

              {/* Sectors Multi-selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Settings size={11} />
                  Vincular Setores
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Selecione quais filas de atendimento este colaborador irá receber.
                </p>

                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {sectorsList.map((sect) => {
                    const sectorKey = sect.name.toUpperCase();
                    const isSelected = editingUser
                      ? editingUser.sectors.split(',').map((s: string) => s.trim().toUpperCase()).includes(sectorKey)
                      : newUser.sectors.split(',').map((s: string) => s.trim().toUpperCase()).includes(sectorKey);

                    return (
                      <button
                        type="button"
                        key={sect.id}
                        onClick={() => toggleSectorSelection(sect.name, !!editingUser)}
                        className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all select-none cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate pr-1">{sect.friendlyName}</span>
                        {isSelected && (
                          <span className="h-1.5 w-1.5 bg-blue-500 dark:bg-blue-400 rounded-full shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {sectorsList.length === 0 && (
                    <p className="text-[10px] italic text-slate-400 col-span-2 text-center py-2">
                      Nenhum setor cadastrado no banco.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserDrawerOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-750 transition-all select-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1 select-none cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
