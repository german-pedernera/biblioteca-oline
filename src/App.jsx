import { useState, useEffect, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabase, sendTelegramNotification, logActivity } from './lib/supabase'
import { FiPlus, FiX, FiBookOpen, FiSettings, FiRefreshCw, FiMinus, FiMaximize2, FiBell, FiMoon, FiSun, FiGlobe, FiChevronDown, FiCheck, FiMenu } from 'react-icons/fi'
import { FaTelegramPlane } from 'react-icons/fa'
import { lazy, Suspense } from 'react'
import Login from './components/Login'
import Footer from './components/Footer'

const Home = lazy(() => import('./components/Home'))
const Sidebar = lazy(() => import('./components/Sidebar'))
const Library = lazy(() => import('./components/Library'))
const MTOList = lazy(() => import('./components/MTOList'))
const UploadPDF = lazy(() => import('./components/UploadPDF'))
const UserManagement = lazy(() => import('./components/UserManagement'))
const Statistics = lazy(() => import('./components/Statistics'))
const GnaMap = lazy(() => import('./components/GnaMap'))
const Todo = lazy(() => import('./components/Todo'))

const EnteringLibrary = () => {
  const libraryBg = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2000"
  
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-slate-900">
      <div 
        className="absolute inset-0 bg-cover bg-center animate-library-zoom"
        style={{ backgroundImage: `url(${libraryBg})` }}
      />
      <div className="absolute inset-y-0 left-0 w-1/2 bg-white border-r border-slate-200 z-10 animate-door-left flex items-center justify-end pr-10">
        <div className="w-1 h-20 bg-indigo-500/20 rounded-full" />
      </div>
      <div className="absolute inset-y-0 right-0 w-1/2 bg-white border-l border-slate-200 z-10 animate-door-right flex items-center justify-start pl-10">
        <div className="w-1 h-20 bg-indigo-500/20 rounded-full" />
      </div>
      <div className="relative z-20 text-center animate-fade-in">
        <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tight drop-shadow-2xl">
          Bienvenido a la <span className="text-indigo-400">Biblioteca</span>
        </h2>
        <p className="text-white/60 mt-4 font-bold uppercase tracking-[0.5em] text-sm">Entrando al Sistema...</p>
      </div>
    </div>
  )
}

const ExitingLibrary = () => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-transparent pointer-events-none">
      <div className="absolute inset-y-0 left-0 w-1/2 bg-white border-r border-slate-200 z-10 animate-door-left-close flex items-center justify-end pr-10">
        <div className="w-1 h-20 bg-indigo-500/20 rounded-full" />
      </div>
      <div className="absolute inset-y-0 right-0 w-1/2 bg-white border-l border-slate-200 z-10 animate-door-right-close flex items-center justify-start pl-10">
        <div className="w-1 h-20 bg-indigo-500/20 rounded-full" />
      </div>
      <div className="relative z-20 text-center animate-fade-in">
        <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight">
          Cerrando Sesión
        </h2>
        <p className="text-slate-400 mt-4 font-bold uppercase tracking-[0.5em] text-xs">Gracias por tu visita</p>
      </div>
    </div>
  )
}

const LoadingScreen = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/40">Cargando Módulo</p>
    </div>
  </div>
)

function Dashboard({ onLogout }) {
  const { isAdmin, user, onlineUsersCount } = useAuth()
  const [activeView, setActiveView] = useState('home')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [supportMessage, setSupportMessage] = useState('')
  const [userSupportHistory, setUserSupportHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [isSendingSupport, setIsSendingSupport] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [unreadReplies, setUnreadReplies] = useState(0)
  const [isSupportMinimized, setIsSupportMinimized] = useState(false)

  const lastUpdateId = useRef(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1)
    setActiveView('library')
  }

  const fetchUserSupportHistory = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_type', 'soporte')
        .eq('user_name', user.nickname || user.username)
        .order('connection_date', { ascending: false })
      
      if (error) throw error
      const logs = data || []
      setUserSupportHistory(logs)
      const unread = logs.filter(log => log.file_name.includes('✅ <b>RESPUESTA ADMIN:</b>')).length
      setUnreadReplies(unread)
    } catch (err) {
      console.error('Error fetching support history:', err)
    }
  }

  useEffect(() => {
    if (showSupportModal) {
      fetchUserSupportHistory()
    }
  }, [showSupportModal])

  const syncTelegramReplies = async () => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
    if (!token || isSyncing) return
    
    setIsSyncing(true)
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId.current + 1}`)
      const data = await response.json()
      
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId.current = update.update_id
          const message = update.message
          
          if (message && message.reply_to_message && message.text) {
            const replyToText = message.reply_to_message.text || ""
            const idMatch = replyToText.match(/REF_ID:.*?([\w-]+)/i)
            
            if (idMatch && idMatch[1]) {
              const logId = idMatch[1]
              const adminResponse = message.text
              
              const { data: logData, error: fetchErr } = await supabase
                .from('activity_logs')
                .select('file_name, user_name')
                .eq('id', logId)
                .maybeSingle()
              
              if (fetchErr) continue
              
              if (logData && !logData.file_name.includes(adminResponse)) {
                const updatedMessage = `${logData.file_name}\n\n✅ <b>RESPUESTA ADMIN:</b> ${adminResponse}`
                const { error: updateErr } = await supabase
                  .from('activity_logs')
                  .update({ file_name: updatedMessage })
                  .eq('id', logId)

                if (!updateErr) {
                  if (showSupportModal) fetchUserSupportHistory()
                  window.dispatchEvent(new CustomEvent('telegram-sync'))
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error en el sincronizador de Telegram:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    syncTelegramReplies()
    const interval = setInterval(syncTelegramReplies, 15000)
    return () => clearInterval(interval)
  }, [])

  const renderView = () => {
    return (
      <Suspense fallback={<LoadingScreen />}>
        {(() => {
          const views = {
            home: <Home setActiveView={setActiveView} />,
            library: <Library key={`ef-${refreshKey}`} category="educacion_fisica" />,
            all: <Library key={`all-${refreshKey}`} category="extra" />,
            mto: <MTOList key={`mto-${refreshKey}`} />,
            gna: <GnaMap isAdmin={isAdmin} />,
            todo: <Todo />,
            upload: isAdmin && <UploadPDF onUploadComplete={handleUploadComplete} />,
            users: isAdmin && <UserManagement />,
            stats: isAdmin && <Statistics />
          }
          return views[activeView] || <Home setActiveView={setActiveView} />
        })()}
      </Suspense>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-indigo-500/20 relative">
      <Suspense fallback={<div className="h-screen bg-slate-50" />}>
        <Sidebar 
          activeView={activeView} 
          setActiveView={(view) => { setActiveView(view); setIsSidebarOpen(false); }} 
          onLogout={onLogout}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
      </Suspense>
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 px-6 lg:px-10 flex items-center justify-between bg-transparent z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-indigo-500 transition-colors mr-4"
          >
            <FiMenu className="text-2xl" />
          </button>
          <div className="flex-1" />

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  {onlineUsersCount} {onlineUsersCount === 1 ? 'Conectado' : 'Conectados'}
                </span>
              </div>

              <button className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-500 transition-all">
                <FiBell className="text-xl" />
              </button>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />

            <div className="flex items-center gap-3 pl-2">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900">{user?.nickname || user?.username}</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{isAdmin ? 'Admin' : 'Usuario'}</span>
              </div>
              <div className="w-11 h-11 bg-indigo-50 border-2 border-white rounded-2xl overflow-hidden shadow-sm flex items-center justify-center text-indigo-600 font-bold">
                {(user?.nickname || user?.username)?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-6 sm:px-10 overflow-y-auto no-scrollbar flex flex-col">
          <div className="max-w-[1600px] mx-auto flex-1 flex flex-col w-full min-h-full">
            <div className="flex-1 space-y-8 pb-32">
              {activeView === 'home' && (
                <>
                  <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-indigo-600 to-indigo-400 p-12 text-white shadow-2xl shadow-indigo-500/20">
                    <div className="relative z-10 max-w-2xl">
                      <h2 className="text-4xl font-bold mb-4">Hola, {user?.nickname || user?.username}</h2>
                      <p className="text-white/80 text-lg leading-relaxed mb-8">
                        La biblioteca es un hogar acogedor para quienes buscan conocimiento y para los lectores apasionados.
                      </p>
                      <button 
                        onClick={() => setActiveView('library')}
                        className="px-8 py-3 bg-white text-indigo-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-lg border border-white"
                      >
                        Explorar ahora
                      </button>
                    </div>
                    <div className="absolute right-0 top-0 w-1/3 h-full bg-white/10 skew-x-12 translate-x-1/2" />
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-400/30 rounded-full blur-3xl animate-pulse" />
                  </div>
                </>
              )}
              <div className="animate-fade-up">
                {renderView()}
              </div>
            </div>
            
          </div>
        </div>
      </main>

      {/* Floating Support Menu */}
      <div className="fixed bottom-4 lg:bottom-8 left-4 right-4 lg:left-auto lg:right-8 z-[999] flex flex-col items-end gap-4">
        {showSupportModal && !isSupportMinimized && (
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-5 lg:p-8 w-full max-w-[420px] animate-fade-up flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-base font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <FaTelegramPlane className="text-indigo-600 text-xl" /> Soporte Técnico
              </h4>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsSupportMinimized(true)} 
                  className="p-2 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                  title="Minimizar"
                >
                  <FiMinus className="text-lg" />
                </button>
                <button onClick={() => setShowSupportModal(false)} className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>
            <textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value.substring(0, 250))}
              placeholder="¿En qué podemos ayudarte?"
              className="w-full h-32 lg:h-40 p-5 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] text-sm lg:text-base font-semibold outline-none focus:border-indigo-600 transition-all resize-none no-scrollbar text-slate-900 placeholder:text-slate-300"
            />
            <div className="flex justify-between items-center mt-5">
                <button 
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) setUnreadReplies(0);
                  }}
                  className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-2"
                >
                  {showHistory ? 'Ocultar Historial' : 'Ver mis mensajes'}
                  {unreadReplies > 0 && !showHistory && (
                    <span className="w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full animate-pulse shadow-sm">
                      {unreadReplies}
                    </span>
                  )}
                </button>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{supportMessage.length}/250</span>
                <button
                  onClick={async () => {
                    if (!supportMessage.trim()) return toast.error('Escribe un mensaje')
                    setIsSendingSupport(true)
                    try {
                      const newLog = await logActivity(user?.nickname || user?.username, 'soporte', supportMessage)
                      await sendTelegramNotification(
                        `🆘 <b>Nuevo Mensaje de Soporte</b>\n👤 Usuario: ${user?.username}\n💬 Mensaje: ${supportMessage}`,
                        null,
                        newLog?.id
                      )
                      toast.success('Mensaje enviado')
                      setSupportMessage('')
                      fetchUserSupportHistory()
                    } catch (err) {
                      toast.error('Error al enviar')
                    }
                    setIsSendingSupport(false)
                  }}
                  disabled={isSendingSupport}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSendingSupport ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>

            {showHistory && (
              <div className="mt-8 pt-6 border-t border-slate-100 flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-0">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mis Consultas Recientes</h5>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchUserSupportHistory();
                        toast.success('Historial actualizado');
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all hover:bg-slate-50 rounded-lg"
                    >
                      <FiRefreshCw className="text-[14px]" />
                    </button>
                    {userSupportHistory.length > 0 && (
                      <button 
                        onClick={() => setShowConfirmDelete(true)}
                        className="text-[9px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                      >
                        Limpiar Historial
                      </button>
                    )}
                  </div>
                </div>
                {userSupportHistory.length === 0 ? (
                  <p className="text-[10px] text-slate-300 italic">No tienes mensajes previos</p>
                ) : (
                  userSupportHistory.map((log) => {
                    const parts = log.file_name.split('✅ <b>RESPUESTA ADMIN:</b>')
                    const userMsg = parts[0].trim()
                    const adminReply = parts[1]?.trim()

                    return (
                      <div key={log.id} className={`space-y-2 p-4 rounded-[2rem] transition-all ${adminReply ? 'bg-green-50/40 border border-green-100' : ''}`}>
                        <div className="flex flex-col items-start w-full">
                          <div className="flex justify-between items-center w-full mb-1">
                            <p className="text-[9px] font-bold text-slate-400 ml-4">{new Date(log.connection_date).toLocaleString()}</p>
                          </div>
                          <div className="p-4 bg-slate-100 rounded-2xl rounded-tl-none border border-slate-200 w-full">
                            <p className="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">{userMsg}</p>
                          </div>
                        </div>
                        
                        {adminReply && (
                          <div className="flex flex-col items-end">
                            <div className="p-4 bg-indigo-600/10 rounded-2xl rounded-tr-none border border-indigo-600/20 w-full">
                              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Respuesta del Soporte</p>
                              <p className="text-xs font-bold text-indigo-700 leading-relaxed whitespace-pre-wrap">{adminReply}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}

        {showSupportModal && isSupportMinimized && (
           <div 
             onClick={() => setIsSupportMinimized(false)}
             className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-center gap-4 animate-fade-up cursor-pointer hover:border-indigo-600 transition-all group"
           >
              <div className="flex items-center gap-4">
                <FaTelegramPlane className="text-indigo-600 text-xl" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Soporte</span>
                  <span className="text-[11px] font-bold text-slate-800">Ventana Minimizada</span>
                </div>
              </div>
              <button className="p-2 bg-slate-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <FiMaximize2 className="text-lg" />
              </button>
           </div>
        )}
        <button 
          onClick={() => {
            setShowSupportModal(!showSupportModal);
            if (!showSupportModal) {
              setUnreadReplies(0);
              setIsSupportMinimized(false);
            }
          }}
          className={`w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all relative ${showSupportModal ? 'rotate-90' : 'animate-pulse'}`}
          title="Soporte"
        >
          {showSupportModal ? <FiX className="text-2xl" /> : <FaTelegramPlane className="text-2xl" />}
          {unreadReplies > 0 && !showSupportModal && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse shadow-lg shadow-indigo-600/40">
              {unreadReplies}
            </span>
          )}
        </button>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <FiX className="text-red-500 text-3xl" />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center mb-3">¿Limpiar Historial?</h3>
            <p className="text-sm font-medium text-slate-500 text-center mb-8 leading-relaxed">
              Esta acción eliminará de forma permanente todos tus mensajes de soporte previos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmDelete(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
              <button 
                onClick={async () => {
                  const { error } = await supabase.from('activity_logs').delete().eq('user_name', user?.username).eq('activity_type', 'soporte')
                  if (!error) {
                    setUserSupportHistory([])
                    toast.success('Historial limpiado')
                    setShowConfirmDelete(false)
                  }
                }}
                className="flex-1 py-4 bg-red-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [isEntering, setIsEntering] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const prevUser = useRef(user)

  const handleLogout = async () => {
    setIsExiting(true)
    logout()
  }

  useEffect(() => {
    if (!prevUser.current && user) {
      setIsEntering(true)
      const timer = setTimeout(() => {
        setIsEntering(false)
      }, 2500)
      return () => clearTimeout(timer)
    }
    prevUser.current = user
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-indigo-500/60 text-xs font-bold tracking-[0.3em] uppercase">Iniciando</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isEntering && <EnteringLibrary />}
      {isExiting && <ExitingLibrary />}
      <div className={`${isEntering ? 'opacity-0' : 'animate-content-reveal'} ${isExiting ? 'animate-exit-fade' : ''}`}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/" element={user ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
          success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
        }}
      />
      <AppContent />
    </AuthProvider>
  )
}
