import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validación preventiva para evitar el crash "supabaseUrl is required"
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing. Check your .env file.')
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Configuración de Administrador Maestro
export const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || 'admin'
export const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'admin'

// Utilidad para Notificaciones de Telegram
export const sendTelegramNotification = async (message, location = null, logId = null) => {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID
  
  if (!token || !chatId) return
  
  let finalMessage = message
  if (logId) {
    finalMessage += `\n\n🆔 <b>REF_ID:</b> <code>${logId}</code>`
  }
  
  if (location) {
    finalMessage += `\n📍 Ubicación: <a href="https://www.google.com/maps?q=${location.lat},${location.lng}">Ver en Mapa</a> (Lat: ${location.lat}, Lng: ${location.lng})`
  }
  
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: finalMessage,
        parse_mode: 'HTML'
      })
    })
  } catch (err) {
    console.error('Error enviando notificación a Telegram:', err)
  }
}

// Utilidad para registrar actividad en la base de datos
export const logActivity = async (userName, activityType, fileName = null) => {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('activity_logs').insert({
      user_name: userName,
      activity_type: activityType,
      file_name: fileName,
      connection_date: new Date().toISOString()
    }).select().single()
    
    if (error) throw error
    return data
  } catch (err) {
    console.error('Error al registrar actividad:', err)
    return null
  }
}
