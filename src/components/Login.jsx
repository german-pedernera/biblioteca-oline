import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, logActivity } from '../lib/supabase'
import { FiBook, FiUser, FiLock, FiAlertCircle, FiLogIn, FiEye, FiEyeOff, FiChevronRight } from 'react-icons/fi'


export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setUsername('')
    setPassword('')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const result = await login(username, password)
      if (!result.success) {
        setError(result.error)
      } else {
        // La notificación y el log se manejan ahora centralizadamente en AuthContext.notifyConnection
        
        // Limpiar historial de soporte al iniciar sesión
        if (supabase) {
          await supabase
            .from('activity_logs')
            .delete()
            .eq('user_name', username)
            .eq('activity_type', 'soporte')
        }
      }
    } catch (err) {
      setError('Error inesperado. Intenta nuevamente.')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dashboard-bg p-4 relative overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md relative animate-fade-up">
        {/* Main Card */}
        <div className="bg-white p-12 lg:p-14 rounded-[3.5rem] border border-slate-50 shadow-soft relative z-10">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-12">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 group overflow-hidden relative">
              <div className="absolute inset-0 bg-dashboard-primary/10 group-hover:bg-dashboard-primary/20 transition-all" />
              <FiBook className="text-dashboard-primary text-4xl relative z-10" />
            </div>
            <h1 className="text-4xl font-bold text-dashboard-text tracking-tight text-center mb-3">
              Biblioteca <span className="text-dashboard-primary">Virtual</span>
            </h1>
            <p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase">Portal de Acceso</p>
          </div>

          {/* Form */}
          {!supabase ? (
            <div className="p-8 bg-amber-50 border border-amber-200 rounded-3xl text-amber-600 text-xs font-bold space-y-3 shadow-inner">
              <div className="flex items-center gap-3">
                <FiAlertCircle className="text-2xl" />
                <p>Configuración Requerida</p>
              </div>
              <p className="font-medium opacity-80 leading-relaxed">Por favor asegúrate de que las variables de entorno de Supabase estén correctamente configuradas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre de Usuario</label>
                <div className="relative group">
                  <FiUser className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-dashboard-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Ingresa tu usuario"
                    autoComplete="off"
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-dashboard-text placeholder:text-slate-300 outline-none focus:bg-white focus:border-dashboard-primary focus:ring-4 focus:ring-dashboard-primary/10 transition-all font-medium text-sm shadow-inner"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contraseña</label>
                <div className="relative group">
                  <FiLock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-dashboard-primary transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full pl-14 pr-14 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-dashboard-text placeholder:text-slate-300 outline-none focus:bg-white focus:border-dashboard-primary focus:ring-4 focus:ring-dashboard-primary/10 transition-all font-medium text-sm shadow-inner"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-4 p-5 bg-red-50/50 border border-red-100 rounded-2xl text-red-500 text-[11px] font-bold animate-shake">
                  <FiAlertCircle className="flex-shrink-0 text-xl" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-dashboard-primary text-white font-bold rounded-[1.5rem] shadow-2xl shadow-dashboard-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-4 group border border-dashboard-primary/10"
              >
                <span className="text-sm">{loading ? 'Autenticando...' : 'Iniciar Sesión'}</span>
                {!loading && <FiChevronRight className="group-hover:translate-x-2 transition-transform" />}
              </button>

            </form>
          )}

          {/* Footer */}
          <div className="mt-12 pt-10 border-t border-slate-50 text-center">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.5em]">
              Sistema de Biblioteca Virtual &bull; 2026
            </p>
          </div>
        </div>

        {/* Outer Shadow/Glow */}
        <div className="absolute inset-0 bg-white/20 blur-3xl -z-10 rounded-full scale-90" />
      </div>
    </div>
  )
}
