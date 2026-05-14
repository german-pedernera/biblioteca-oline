import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, ADMIN_USER, ADMIN_PASS, sendTelegramNotification, logActivity } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(null)
  const [onlineUsersCount, setOnlineUsersCount] = useState(0)
  const hasNotifiedRef = useRef(false)

  useEffect(() => {
    // Forzamos la limpieza de cualquier sesión previa al cargar para cumplir con el requisito de "login vacío"
    setUser(null);
    setIsAdmin(false);
    setLoading(false);
  }, [])

  // Tracking de Usuarios Online via Supabase Presence
  useEffect(() => {
    if (!supabase || !user) {
      if (!user) setOnlineUsersCount(0)
      return
    }

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.username,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const count = Object.keys(state).length
        setOnlineUsersCount(count)
      })
      .on('presence', { event: 'join', filter: { key: user.username } }, ({ newPresences }) => {
        // console.log('join', newPresences)
      })
      .on('presence', { event: 'leave', filter: { key: user.username } }, ({ leftPresences }) => {
        // console.log('leave', leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username: user.username,
            nickname: user.nickname,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  // Listener para desconexión al cerrar la pestaña
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        notifyDisconnect(user)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user, startTime])

  const login = async (username, password) => {
    const cleanUsername = username.trim()
    
    try {
      if (cleanUsername === ADMIN_USER && password === ADMIN_PASS) {
        let finalNickname = cleanUsername
        try {
          const { data: dbAdmin } = await supabase
            .from('library_users')
            .select('nickname')
            .eq('username', cleanUsername)
            .single()
          if (dbAdmin?.nickname) finalNickname = dbAdmin.nickname
        } catch (e) { /* silent fail */ }

        const userData = { 
          username: cleanUsername, 
          nickname: finalNickname,
          isAdmin: true, 
          displayName: finalNickname 
        }
        setUser(userData)
        setIsAdmin(true)
        
        // Notificaciones en segundo plano
        notifyConnection(userData).catch(console.error)
        
        return { success: true }
      }

      if (!supabase) return { success: false, error: 'Configuración faltante.' }

      const { data, error } = await supabase
        .from('library_users')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password', password)
      
      if (error || !data || data.length === 0) {
        return { success: false, error: 'Credenciales inválidas.' }
      }

      const foundUser = data[0]
      if (!foundUser.is_active) return { success: false, error: 'Cuenta desactivada.' }

      const userData = { 
        username: foundUser.username, 
        nickname: foundUser.nickname || foundUser.username,
        isAdmin: foundUser.is_admin || false, 
        displayName: foundUser.nickname || foundUser.username, 
        id: foundUser.id 
      }
      
      setUser(userData)
      setIsAdmin(userData.isAdmin)
      
      // Ejecutar notificaciones en segundo plano para no bloquear el acceso del usuario
      notifyConnection(userData).catch(console.error);
      
      return { success: true }
    } catch (err) {
      return { success: false, error: 'Error inesperado.' }
    }
  }

  const notifyConnection = async (u) => {
    setStartTime(Date.now())
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-AR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit' 
    })
    const device = window.innerWidth < 768 ? 'Móvil' : 'Escritorio'
    const role = u.isAdmin ? 'Administrador' : 'Lector'
    
    let location = null
    let placeName = 'Desconocido'
    
    try {
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          location = { lat: position.coords.latitude, lng: position.coords.longitude };
          const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lng}&localityLanguage=es`)
          const geoData = await geoRes.json()
          placeName = `${geoData.locality || geoData.city || 'Desconocido'}, ${geoData.principalSubdivision}, ${geoData.countryName}`
        } catch (e) {}
      }
      if (placeName === 'Desconocido') {
        const ipRes = await fetch('https://ipapi.co/json/')
        const ipData = await ipRes.json()
        placeName = `${ipData.city || 'Desconocido'}, ${ipData.region}, ${ipData.country_name}`
      }
    } catch (err) {}

    await sendTelegramNotification(
      `🟢 <b>BIBLIOTECA - CONEXIÓN</b>\n\n👤 Apodo: <b>${u.nickname}</b>\n🆔 ID: <code>${u.username}</code>\n🎭 Rol: <b>${role}</b>\n🌍 Lugar: <b>${placeName}</b>\n📱 Dispositivo: <b>${device}</b>\n📅 ${dateStr}`,
      location
    )

    // Registrar en Tablero de Control (actividad de base de datos)
    const loginDetails = `Acceso Manual | Ubicación: ${placeName}`
      
    await logActivity(u.nickname || u.username, 'login', loginDetails)
  }

  const notifyDisconnect = async (u) => {
    if (!startTime) return
    const durationMs = Date.now() - startTime
    const minutes = Math.floor(durationMs / 60000)
    const hours = Math.floor(minutes / 60)
    const durationStr = hours > 0 ? `${hours}h ${minutes % 60}min` : `${minutes} min`
    
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })

    await sendTelegramNotification(
      `🔴 <b>BIBLIOTECA - DESCONEXIÓN</b>\n\n👤 Apodo: <b>${u.nickname}</b>\n🆔 ID: <code>${u.username}</code>\n⏱ Duración: <b>${durationStr}</b>\n📅 ${dateStr}`
    )
  }

  const logout = () => {
    console.log('Ejecutando logout...');
    
    // 1. Limpieza de estado local inmediata
    setUser(null);
    setIsAdmin(false);
    localStorage.clear();
    sessionStorage.clear();

    // 2. Intentar notificar a Supabase/Telegram sin esperar
    try {
      if (supabase) supabase.auth.signOut();
    } catch (e) {}

    // 3. Redirección forzada
    console.log('Redirigiendo al login...');
    window.location.assign(window.location.origin);
  }




  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout, onlineUsersCount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
