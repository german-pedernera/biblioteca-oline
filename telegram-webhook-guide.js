/**
 * GUÍA DE ESTRUCTURA PARA RECIBIR RESPUESTAS DE TELEGRAM
 * 
 * Este es un ejemplo de cómo debería ser tu Webhook (Backend) para que cuando
 * respondas en Telegram, el mensaje llegue automáticamente a la web.
 * 
 * Puedes desplegar esto como una función serverless (Vercel, Netlify) o un servidor Node.js.
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración (Usa tus variables de entorno)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const { message } = req.body;
  if (!message || !message.text) return res.status(200).send('OK');

  // 1. Detectar si el admin está respondiendo a un mensaje que tiene el REF_ID
  const replyTo = message.reply_to_message;
  if (!replyTo) return res.status(200).send('OK');

  // 2. Extraer el REF_ID del texto del mensaje original
  // Buscamos algo como: REF_ID: 123
  const idMatch = replyTo.text.match(/REF_ID:<\/b> <code>(\d+)<\/code>/) || replyTo.text.match(/REF_ID: (\d+)/);
  
  if (idMatch && idMatch[1]) {
    const logId = idMatch[1];
    const adminResponse = message.text;

    try {
      // 3. Obtener el mensaje original para no sobreescribir
      const { data: originalLog } = await supabase
        .from('activity_logs')
        .select('file_name')
        .eq('id', logId)
        .single();

      if (originalLog) {
        // 4. Formatear la respuesta igual que lo hace la web
        const updatedMessage = `${originalLog.file_name}\n\n✅ <b>RESPUESTA ADMIN:</b> ${adminResponse}`;

        // 5. Actualizar Supabase
        await supabase
          .from('activity_logs')
          .update({ file_name: updatedMessage })
          .eq('id', logId);

        console.log(`Log ${logId} actualizado con respuesta de Telegram`);
      }
    } catch (err) {
      console.error('Error actualizando Supabase desde Telegram:', err);
    }
  }

  res.status(200).send('OK');
};

/**
 * INSTRUCCIONES PARA ACTIVAR:
 * 
 * 1. Despliega este código en una URL pública (ej: https://tu-app.vercel.app/api/telegram-webhook).
 * 2. Registra el Webhook en Telegram usando esta URL en tu navegador:
 *    https://api.telegram.org/bot<TU_TOKEN_DEL_BOT>/setWebhook?url=https://tu-app.vercel.app/api/telegram-webhook
 */
