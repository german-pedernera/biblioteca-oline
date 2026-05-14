import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FiUsers, FiUserPlus, FiTrash2, FiSearch, FiToggleLeft, FiToggleRight, FiUser, FiShield, FiEdit2, FiX, FiMinus, FiMaximize2, FiChevronUp, FiChevronDown, FiPlus, FiDownload } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Footer from './Footer'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newNickname, setNewNickname] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isFormVisible, setIsFormVisible] = useState(true)
  
  // Estados para edición
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('library_users').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      toast.error('Error al cargar usuarios')
    }
    setLoading(false)
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUsername.trim() || !newPassword.trim()) return
    setIsAdding(true)
    
    try {
      const cleanUsername = newUsername.trim()
      const cleanPassword = newPassword.trim()
      const cleanNickname = newNickname.trim() || cleanUsername

      if (editingUser) {
        // Verificar si el nombre de usuario ya existe en OTRO registro
        if (cleanUsername.toLowerCase() !== editingUser.username.toLowerCase()) {
          const { data: existing } = await supabase
            .from('library_users')
            .select('id')
            .eq('username', cleanUsername)
            .single()
          
          if (existing) {
            throw new Error('Este nombre de usuario ya está siendo usado por otra persona.')
          }
        }

        // Actualizar usuario existente
        const { error } = await supabase
          .from('library_users')
          .update({ 
            username: cleanUsername, 
            password: cleanPassword,
            nickname: cleanNickname
          })
          .eq('id', editingUser.id)
        
        if (error) throw error
        toast.success('Usuario actualizado correctamente')
        setEditingUser(null)
      } else {
        // Crear nuevo usuario - Primero verificar si existe
        const { data: existing } = await supabase
          .from('library_users')
          .select('id')
          .eq('username', cleanUsername)
          .single()
        
        if (existing) {
          throw new Error('Este nombre de usuario ya existe. Usa otro o edita el existente.')
        }

        const { error } = await supabase.from('library_users').insert([{ 
          username: cleanUsername, 
          password: cleanPassword, 
          nickname: cleanNickname,
          is_active: true,
          is_admin: false
        }])
        if (error) throw error
        toast.success('Usuario creado')
      }
      
      setNewUsername('')
      setNewPassword('')
      setNewNickname('')
      fetchUsers()
    } catch (err) {
      console.error('Error:', err)
      const msg = err.code === '23505' ? 'Este nombre de usuario ya está en uso.' : err.message
      toast.error(msg)
    }
    setIsAdding(false)
  }

  const startEdit = (user) => {
    setEditingUser(user)
    setNewUsername(user.username)
    setNewPassword(user.password)
    setNewNickname(user.nickname || user.username)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setNewUsername('')
    setNewPassword('')
    setNewNickname('')
  }

  const toggleUserStatus = async (user) => {
    try {
      await supabase.from('library_users').update({ is_active: !user.is_active }).eq('id', user.id)
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      toast.success(user.is_active ? 'Desactivado' : 'Activado')
    } catch (err) {
      toast.error('Error')
    }
  }

  const toggleAdminStatus = async (user) => {
    try {
      await supabase.from('library_users').update({ is_admin: !user.is_admin }).eq('id', user.id)
      setUsers(users.map(u => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u))
      toast.success(user.is_admin ? 'Admin removido' : 'Admin otorgado')
    } catch (err) {
      toast.error('Error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar definitivamente?')) return
    try {
      await supabase.from('library_users').delete().eq('id', id)
      setUsers(users.filter(u => u.id !== id))
      toast.success('Eliminado')
    } catch (err) {
      toast.error('Error')
    }
  }

  const [isFullyCollapsed, setIsFullyCollapsed] = useState(false)

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))

  const exportToPDF = () => {
    const element = document.getElementById('user-report-content');
    if (!element) return;

    // Crear una copia temporal para manipular estilos sin afectar la UI real
    const clonedElement = element.cloneNode(true);
    clonedElement.style.display = 'block';
    clonedElement.style.maxHeight = 'none';
    clonedElement.style.opacity = '1';
    
    // Mostrar elementos exclusivos de PDF
    const pdfOnly = clonedElement.querySelectorAll('.pdf-only');
    pdfOnly.forEach(el => el.classList.remove('hidden'));
    
    // Ocultar elementos que no deben salir (ej: columna de acciones)
    const noExport = clonedElement.querySelectorAll('.no-export');
    noExport.forEach(el => el.remove());

    const opt = {
      margin: [10, 10],
      filename: `Reporte_Personal_GNA_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    toast.promise(
      window.html2pdf().set(opt).from(clonedElement).save(),
      {
        loading: 'Generando reporte...',
        success: 'Reporte descargado',
        error: 'Error al generar PDF'
      }
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-dashboard-text tracking-tight">Gestión de Usuarios</h2>
        <p className="text-slate-400 mt-1 font-medium">Administra permisos de acceso e identidades del personal.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-10 items-start">
        {/* Form Card (Create/Edit) */}
        <div className={`xl:col-span-1 p-10 rounded-[3rem] border transition-all duration-500 ${isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none hidden'} ${editingUser ? 'bg-indigo-50/30 border-indigo-200 shadow-xl shadow-indigo-500/5' : 'bg-white border-slate-200 shadow-card'}`}>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${editingUser ? 'bg-dashboard-primary text-white shadow-lg shadow-dashboard-primary/20' : 'bg-indigo-50 text-dashboard-primary border border-indigo-100'}`}>
                {editingUser ? <FiEdit2 className="text-xl" /> : <FiUserPlus className="text-xl" />}
              </div>
              <h3 className="font-bold text-dashboard-text tracking-tight">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            </div>
            <div className="flex gap-2">
              {editingUser && (
                <button onClick={cancelEdit} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all border border-transparent hover:border-slate-200">
                  <FiX className="text-lg" />
                </button>
              )}
              <button 
                onClick={() => setIsFormVisible(false)}
                className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-transparent hover:border-slate-200"
                title="Hide Form"
              >
                <FiMinus className="text-lg" />
              </button>
            </div>
          </div>
          
          <form onSubmit={handleAddUser} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">ID de Acceso (Usuario)</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="ej. dario2026" className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-dashboard-primary transition-all text-sm font-bold placeholder:text-slate-300 shadow-inner" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre a Mostrar (Apodo)</label>
              <input type="text" value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder="ej. Dario" className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-dashboard-primary transition-all text-sm font-bold placeholder:text-slate-300 shadow-inner" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contraseña</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Contraseña Segura" className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-dashboard-primary transition-all text-sm font-bold placeholder:text-slate-300 shadow-inner" required />
            </div>
            <div className="flex flex-col gap-4 pt-4">
              <button type="submit" disabled={isAdding} className="w-full py-5 bg-dashboard-primary text-white font-bold rounded-2xl shadow-xl shadow-dashboard-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all text-sm border border-dashboard-primary/10">
                {isAdding ? 'Procesando...' : editingUser ? 'Guardar Cambios' : 'Crear Acceso'}
              </button>
              {editingUser && (
                <button type="button" onClick={cancelEdit} className="w-full py-5 bg-white text-slate-400 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all text-sm shadow-sm">
                  Cancelar Edición
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Users List Table */}
        <div className={`${isFormVisible ? 'xl:col-span-3' : 'xl:col-span-4'} bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-card overflow-hidden transition-all duration-500`}>
          <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
              {!isFormVisible && (
                <button 
                  onClick={() => setIsFormVisible(true)}
                  className="w-full sm:w-auto flex items-center justify-center h-12 px-6 bg-dashboard-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:translate-y-[-2px] transition-all shadow-xl shadow-dashboard-primary/20 border border-dashboard-primary/10 shrink-0"
                >
                  <FiPlus className="mr-2 text-sm" /> Añadir Usuario
                </button>
              )}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
                  <FiUsers className="text-dashboard-primary text-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-dashboard-text leading-tight text-base sm:text-lg">Base de Datos de Personal</h3>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Gestión de Cuentas</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setIsFullyCollapsed(!isFullyCollapsed)}
                  className={`flex-1 sm:flex-none p-3 rounded-2xl border transition-all flex items-center justify-center gap-2 group ${isFullyCollapsed ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-400 border-slate-200 shadow-inner'}`}
                >
                  {isFullyCollapsed ? <FiChevronDown /> : <FiChevronUp />}
                  <span className="text-[10px] font-black uppercase tracking-widest sm:hidden lg:inline">{isFullyCollapsed ? 'Ver' : 'Ocultar'}</span>
                </button>

                <button 
                  onClick={exportToPDF}
                  className="flex-1 sm:flex-none flex items-center justify-center h-12 px-4 sm:px-6 bg-white border border-slate-200 text-dashboard-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-dashboard-primary hover:text-white transition-all shadow-sm group"
                >
                  <FiDownload className="text-lg mr-2" /> Exportar
                </button>
              </div>
            </div>
            <div className="relative w-full lg:w-80">
              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar personal..." className="w-full pl-12 pr-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-dashboard-primary text-xs font-bold transition-all shadow-inner" />
            </div>
          </div>
          
          <div id="user-report-content" className={`transition-all duration-500 ${isFullyCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
            {/* Header for PDF only */}
            <div className="hidden pdf-only p-10 bg-white border-b-4 border-dashboard-primary mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-dashboard-text">Biblioteca Virtual</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-dashboard-primary mt-2">Reporte de Personal Autorizado</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Fecha de Emisión</p>
                  <p className="font-bold text-dashboard-text text-lg">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Vista Desktop: Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-10 py-6">Personal</th>
                    <th className="px-10 py-6">ID / Contraseña</th>
                    <th className="px-8 py-6 text-center">Estado</th>
                    <th className="px-8 py-6 text-center">Admin</th>
                    <th className="px-10 py-6 no-export text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-100/30 transition-colors ${editingUser?.id === u.id ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-dashboard-primary font-bold text-lg shadow-sm border border-indigo-100/50">
                          {(u.nickname || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-dashboard-text text-base leading-none group-hover:text-dashboard-primary transition-colors">
                            {u.nickname || u.username}
                          </span>
                          <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] mt-1.5">Perfil Completo</span>
                        </div>
                      </div>
                    </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col gap-1.5 text-left">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ID: <span className="text-dashboard-text">{u.username}</span></span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">PASS: {u.password}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button onClick={() => toggleUserStatus(u)} className={`text-3xl transition-all hover:scale-110 ${u.is_active ? 'text-green-500' : 'text-slate-200'}`}>
                            {u.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                          </button>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button onClick={() => toggleAdminStatus(u)} className={`text-3xl transition-all hover:scale-110 ${u.is_admin ? 'text-dashboard-primary' : 'text-slate-200'}`}>
                            {u.is_admin ? <FiToggleRight /> : <FiToggleLeft />}
                          </button>
                        </td>
                    <td className="px-10 py-6 no-export text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => startEdit(u)} className="p-3 text-slate-300 hover:text-dashboard-primary hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100/50"><FiEdit2 className="text-lg" /></button>
                        <button onClick={() => handleDelete(u.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100/50"><FiTrash2 className="text-lg" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            <div className="md:hidden flex flex-col gap-4 p-4">
              {filteredUsers.map(u => (
                <div key={u.id} className={`bg-white border border-slate-200 rounded-[2rem] p-6 space-y-6 ${editingUser?.id === u.id ? 'border-dashboard-primary shadow-xl shadow-dashboard-primary/5' : 'shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-dashboard-primary font-black text-lg shadow-sm border border-indigo-100/50">
                        {(u.nickname || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-dashboard-text text-base leading-tight">{u.nickname || u.username}</h4>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">ID: {u.username}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-1 shadow-inner">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                      <button onClick={() => toggleUserStatus(u)} className={`text-2xl transition-all ${u.is_active ? 'text-green-500' : 'text-slate-200'}`}>
                        {u.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-1 shadow-inner">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Admin</span>
                      <button onClick={() => toggleAdminStatus(u)} className={`text-2xl transition-all ${u.is_admin ? 'text-dashboard-primary' : 'text-slate-200'}`}>
                        {u.is_admin ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Contraseña</span>
                      <div className="bg-white/60 px-3 py-2 rounded-xl border border-slate-100/50">
                        <span className="text-xs font-bold text-slate-600 font-mono tracking-wider break-all">{u.password}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => startEdit(u)} 
                      className="flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 text-slate-400 hover:text-dashboard-primary hover:border-dashboard-primary/20 rounded-xl transition-all text-[10px] font-bold shadow-sm"
                    >
                      <FiEdit2 /> Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)} 
                      className="flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all text-[10px] font-bold border border-transparent hover:border-red-200"
                    >
                      <FiTrash2 /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
