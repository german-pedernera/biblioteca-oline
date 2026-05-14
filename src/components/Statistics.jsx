import { useState, useEffect } from 'react'
import { supabase, logActivity } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FiBarChart2, FiDownload, FiUsers, FiTrendingUp, FiFileText, FiActivity, FiZap, FiCpu, FiList, FiX, FiTrash2, FiSave, FiEdit2, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi'
import { FaTelegramPlane } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Footer from './Footer'

export default function Statistics() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [mostDownloaded, setMostDownloaded] = useState([])
  const [storageInfo, setStorageInfo] = useState({ used: 0, limit: 1024 * 1024 * 1024 })
  const [userActivity, setUserActivity] = useState([])
  const [totals, setTotals] = useState({ docs: 0, mtos: 0, downloads: 0 })
  
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [editingLogId, setEditingLogId] = useState(null)
  const [editLogData, setEditLogData] = useState({})
  const [replyingLogId, setReplyingLogId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [showSupportHistory, setShowSupportHistory] = useState(false)
  const [supportLogs, setSupportLogs] = useState([])
  const [loadingSupport, setLoadingSupport] = useState(false)
  const [unrepliedCount, setUnrepliedCount] = useState(0)
  
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false)
  const [logToDelete, setLogToDelete] = useState(null)

  const [showContribs, setShowContribs] = useState(false)
  const [contribs, setContribs] = useState([])
  const [loadingContribs, setLoadingContribs] = useState(false)
  const [editingContribId, setEditingContribId] = useState(null)
  const [editContribComment, setEditContribComment] = useState('')

  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [approveTarget, setApproveTarget] = useState('')
  const [selectedContrib, setSelectedContrib] = useState(null)
  const [approveFormData, setApproveFormData] = useState({
    title: '',
    description: '',
    date_mto: '',
    prefix: '',
    number: '',
    content: ''
  })

  useEffect(() => { 
    fetchStats()
    runDataMigration()
    
    const contribSubscription = supabase
      .channel('public:contributions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, () => {
        fetchStats() 
      })
      .subscribe()

    return () => {
      supabase.removeChannel(contribSubscription)
    }
  }, [])

  const runDataMigration = async () => {
    try {
      await supabase.from('documents').update({ category: 'educacion_fisica' }).eq('category', 'reglamentos')
      const { data: others } = await supabase.from('documents').select('id, category')
      if (others) {
        for (const doc of others) {
          if (doc.category !== 'educacion_fisica' && doc.category !== 'extra') {
            await supabase.from('documents').update({ category: 'extra' }).eq('id', doc.id)
          }
        }
      }
      fetchStats() 
    } catch (err) {
      console.error('Error en migración:', err)
    }
  }

  const fetchStats = async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    try {
      const [docsRes, mtosRes, contribsRes] = await Promise.all([
        supabase.from('documents').select('title, download_count, uploader_name'),
        supabase.from('mto_recibidos').select('prefix, number, download_count, uploader_name'),
        supabase.from('contributions').select('id', { count: 'exact' }).eq('status', 'pending')
      ])

      const allDocs = docsRes.data || []
      const allMtos = mtosRes.data || []
      
      if (contribsRes.count !== null) {
        setContribs(new Array(contribsRes.count).fill({ id: 'dummy' }))
      }

      const totalDownloads = [...allDocs, ...allMtos].reduce((acc, curr) => acc + (curr.download_count || 0), 0)
      setTotals({ docs: allDocs.length, mtos: allMtos.length, downloads: totalDownloads })

      const { data: supportData } = await supabase
        .from('activity_logs')
        .select('file_name')
        .eq('activity_type', 'soporte')
      
      if (supportData) {
        const unreplied = supportData.filter(log => !log.file_name.includes('✅ <b>RESPUESTA ADMIN:</b>')).length
        setUnrepliedCount(unreplied)
      }

      const combinedItems = [
        ...allDocs.map(d => ({ title: d.title, count: d.download_count || 0, user: d.uploader_name })),
        ...allMtos.map(m => ({ title: `${m.prefix} ${m.number}`, count: m.download_count || 0, user: m.uploader_name }))
      ]
      setMostDownloaded(combinedItems.sort((a, b) => b.count - a.count).slice(0, 6))

      const activityMap = {}
      const processItem = (item) => {
        const name = item.uploader_name
        if (name && name.trim() !== '') {
          activityMap[name] = (activityMap[name] || 0) + 1
        }
      }
      allDocs.forEach(processItem)
      allMtos.forEach(processItem)
      
      setUserActivity(Object.entries(activityMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4))

      const { data: files } = await supabase.storage.from('pdfs').list('', { limit: 1000 })
      let totalSize = 0
      files?.forEach(file => { totalSize += file.metadata?.size || 0 })
      setStorageInfo(prev => ({ ...prev, used: totalSize }))

    } catch (err) {
      toast.error('Error al cargar estadísticas')
    }
    setLoading(false)
  }

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('connection_date', { ascending: false })
      
      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      toast.error('Error al cargar la lista de actividad')
    }
    setLoadingLogs(false)
  }

  const fetchSupportLogs = async () => {
    setLoadingSupport(true)
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_type', 'soporte')
        .order('connection_date', { ascending: false })
      
      if (error) throw error
      setSupportLogs(data || [])
    } catch (err) {
      toast.error('Error al cargar historial de soporte')
    }
    setLoadingSupport(false)
  }

  const handleDeleteLog = async (id, isSupport = false) => {
    setLogToDelete({ id, isSupport })
    setShowConfirmDelete(true)
  }

  const confirmDelete = async () => {
    const { id, isSupport } = logToDelete
    try {
      const { error } = await supabase.from('activity_logs').delete().eq('id', id)
      if (error) throw error
      if (isSupport) {
        setSupportLogs(supportLogs.filter(log => log.id !== id))
      } else {
        setLogs(logs.filter(log => log.id !== id))
      }
      toast.success('Registro eliminado')
      setShowConfirmDelete(false)
      setLogToDelete(null)
    } catch (err) {
      toast.error('Error al eliminar')
    }
  }

  const handleSaveLog = async (id, isSupport = false) => {
    try {
      const { error } = await supabase.from('activity_logs').update(editLogData).eq('id', id)
      if (error) throw error
      if (isSupport) {
        setSupportLogs(supportLogs.map(log => log.id === id ? { ...log, ...editLogData } : log))
      } else {
        setLogs(logs.map(log => log.id === id ? { ...log, ...editLogData } : log))
      }
      setEditingLogId(null)
      toast.success('Cambios guardados')
    } catch (err) {
      toast.error('Error al guardar')
    }
  }

  const handleReplySupport = async (log) => {
    if (!replyText.trim()) return toast.error('Escribe una respuesta')
    try {
      const updatedMessage = `${log.file_name}\n\n✅ <b>RESPUESTA ADMIN:</b> ${replyText}`
      const { error } = await supabase
        .from('activity_logs')
        .update({ file_name: updatedMessage })
        .eq('id', log.id)
      
      if (error) throw error
      
      setSupportLogs(supportLogs.map(s => s.id === log.id ? { ...s, file_name: updatedMessage } : s))
      setReplyingLogId(null)
      setReplyText('')
      toast.success('Respuesta enviada')
    } catch (err) {
      toast.error('Error al responder')
    }
  }

  useEffect(() => {
    fetchStats()
    fetchLogs()
    
    const handleSync = () => {
      fetchSupportLogs()
    }
    window.addEventListener('telegram-sync', handleSync)
    
    const interval = setInterval(fetchStats, 60000)
    return () => {
      clearInterval(interval)
      window.removeEventListener('telegram-sync', handleSync)
    }
  }, [])

  const handleExportPDF = async () => {
    if (!logs || logs.length === 0) return toast.error('No hay datos para exportar')
    const toastId = toast.loading('Generando reporte completo...')

    try {
      const totalCon = logs.filter(l => l.activity_type === 'login').length
      const totalDes = logs.filter(l => l.activity_type === 'download').length
      
      let tableRows = ''
      logs.forEach((log, index) => {
        tableRows += `
          <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px;">${new Date(log.connection_date).toLocaleString()}</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px; font-weight: bold;">${log.user_name}</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 10px; text-transform: uppercase; font-weight: 800; color: ${log.activity_type === 'login' ? '#059669' : '#2563eb'};">${log.activity_type}</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 10px; color: #4b5563;">${log.file_name || '-'}</td>
          </tr>
        `
      })

      const htmlContent = `
        <div style="padding: 30px; font-family: Arial, sans-serif; color: #1f2937; background: white;">
          <table style="width: 100%; border-bottom: 3px solid #2149b1; margin-bottom: 20px;">
            <tr>
              <td style="padding-bottom: 10px;">
                <h1 style="color: #2149b1; font-size: 24px; margin: 0;">SISTEMA DE BIBLIOTECA</h1>
                <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">REPORTE OFICIAL DE ACTIVIDAD</p>
              </td>
              <td style="text-align: right; padding-bottom: 10px; font-size: 11px; color: #6b7280;">
                Emitido: ${new Date().toLocaleString()}
              </td>
            </tr>
          </table>

          <table style="width: 100%; margin-bottom: 30px; border-spacing: 10px; border-collapse: separate;">
            <tr>
              <td style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; width: 33%;">
                <div style="font-size: 10px; font-weight: bold; color: #6b7280; margin-bottom: 5px;">TOTAL REGISTROS</div>
                <div style="font-size: 20px; font-weight: bold; color: #1f2937;">${logs.length}</div>
              </td>
              <td style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; width: 33%;">
                <div style="font-size: 10px; font-weight: bold; color: #6b7280; margin-bottom: 5px;">CONEXIONES</div>
                <div style="font-size: 20px; font-weight: bold; color: #059669;">${totalCon}</div>
              </td>
              <td style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; width: 33%;">
                <div style="font-size: 10px; font-weight: bold; color: #6b7280; margin-bottom: 5px;">DESCARGAS</div>
                <div style="font-size: 20px; font-weight: bold; color: #2563eb;">${totalDes}</div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #2149b1;">
                <th style="color: white; padding: 12px; text-align: left; font-size: 12px; border: 1px solid #2149b1;">FECHA/HORA</th>
                <th style="color: white; padding: 12px; text-align: left; font-size: 12px; border: 1px solid #2149b1;">USUARIO</th>
                <th style="color: white; padding: 12px; text-align: left; font-size: 12px; border: 1px solid #2149b1;">ACTIVIDAD</th>
                <th style="color: white; padding: 12px; text-align: left; font-size: 12px; border: 1px solid #2149b1;">DETALLE ARCHIVO</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Fin del reporte - Documento generado por el Panel de Administración
          </div>
        </div>
      `

      const opt = {
        margin: 10,
        filename: 'reporte_completo_actividad.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      await window.html2pdf().from(htmlContent).set(opt).save()
      logActivity(user?.nickname || user?.username, 'report', 'Generación de reporte PDF completo')
      toast.success('Reporte generado con éxito', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF', { id: toastId })
    }
  }

  const handleClearAllLogs = async () => {
    setShowConfirmClearAll(true)
  }

  const confirmClearAll = async () => {
    const toastId = toast.loading('Borrando todos los registros...')
    try {
      const { error } = await supabase.from('activity_logs').delete().not('id', 'is', null)
      if (error) throw error
      setLogs([])
      setShowConfirmClearAll(false)
      toast.success('Lista vaciada con éxito', { id: toastId })
      fetchStats() 
    } catch (err) {
      console.error('Error al vaciar logs:', err)
      toast.error('Error al vaciar la lista', { id: toastId })
    }
  }

  const fetchContribs = async () => {
    setLoadingContribs(true)
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      setContribs(data || [])
    } catch (err) {
      toast.error('Error al cargar aportes')
    }
    setLoadingContribs(false)
  }

  const openApproveModal = (contrib, target) => {
    setSelectedContrib(contrib)
    setApproveTarget(target)
    const currentComment = editingContribId === contrib.id ? editContribComment : (contrib.comment || '')
    
    setApproveFormData({
      title: contrib.file_name?.split('.')[0] || '',
      description: currentComment,
      date_mto: new Date().toISOString().split('T')[0],
      prefix: '',
      number: '',
      content: currentComment
    })
    setShowApproveModal(true)
  }

  const handleApproveContrib = async () => {
    if (!selectedContrib) return
    const toastId = toast.loading(`Aprobando para ${approveTarget.toUpperCase()}...`)
    
    try {
      let table = 'documents'
      let payload = {}

      if (approveTarget === 'mto') {
        table = 'mto_recibidos'
        payload = {
          prefix: approveFormData.prefix || 'MTO',
          number: approveFormData.number || 'S/N',
          content: approveFormData.content,
          file_urls: [selectedContrib.file_url],
          file_names: [selectedContrib.file_name],
          uploader_name: selectedContrib.user_name,
          download_count: 0,
          date_mto: approveFormData.date_mto || new Date().toISOString().split('T')[0]
        }
      } else {
        payload = {
          title: approveFormData.title || selectedContrib.file_name?.split('.')[0] || 'Nuevo Archivo',
          description: approveFormData.description,
          file_urls: [selectedContrib.file_url],
          file_names: [selectedContrib.file_name],
          category: approveTarget === 'extra' ? 'extra' : 'educacion_fisica',
          uploader_name: selectedContrib.user_name,
          download_count: 0,
          created_at: new Date().toISOString()
        }
      }

      const { error: insErr } = await supabase.from(table).insert(payload)
      if (insErr) throw insErr

      const { error: upErr } = await supabase.from('contributions').update({ 
        status: 'approved', 
        category: approveTarget,
        comment: approveTarget === 'mto' ? approveFormData.content : approveFormData.description
      }).eq('id', selectedContrib.id)
      
      if (upErr) throw upErr

      setContribs(contribs.filter(c => c.id !== selectedContrib.id))
      setShowApproveModal(false)
      toast.success('¡Aporte publicado con éxito!', { id: toastId })
      fetchStats()
    } catch (err) {
      console.error('Error al aprobar:', err)
      toast.error('Error: ' + (err.message || 'Error al procesar'), { id: toastId })
    }
  }

  const handleDeleteContrib = async (id) => {
    try {
      const { error } = await supabase.from('contributions').delete().eq('id', id)
      if (error) throw error
      setContribs(contribs.filter(c => c.id !== id))
      toast.success('Aporte eliminado')
    } catch (err) {
      toast.error('Error al eliminar')
    }
  }

  const handleUpdateContribComment = async (id) => {
    try {
      const { error } = await supabase.from('contributions').update({ comment: editContribComment }).eq('id', id)
      if (error) throw error
      setContribs(contribs.map(c => c.id === id ? { ...c, comment: editContribComment } : c))
      setEditingContribId(null)
      toast.success('Comentario actualizado')
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  const handleDownloadContrib = async (url, name) => {
    if (!url) return toast.error('URL no válida')
    const toastId = toast.loading('Bajando aporte...')
    try {
      logActivity(user?.nickname || user?.username, 'download', `APORTE: ${name}`)
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = name || 'aporte.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Aporte guardado', { id: toastId })
    } catch (err) {
      window.open(url, '_blank')
      toast.dismiss(toastId)
    }
  }

  const handleResetStats = () => {
    setShowResetModal(true)
  }

  const confirmResetStats = async () => {
    setShowResetModal(false)
    const toastId = toast.loading('Reiniciando estadísticas...')
    try {
      await supabase.from('activity_logs').delete().not('connection_date', 'is', null)
      await supabase.from('documents').update({ download_count: 0 }).gte('download_count', 0)
      await supabase.from('mto_recibidos').update({ download_count: 0 }).gte('download_count', 0)
      await supabase.from('documents').update({ uploader_name: null }).not('id', 'is', null)
      await supabase.from('mto_recibidos').update({ uploader_name: null }).not('id', 'is', null)
      toast.success('Estadísticas reiniciadas con éxito', { id: toastId })
      fetchStats() 
      if (showLogs) fetchLogs() 
    } catch (err) {
      console.error(err)
      toast.error('Error al reiniciar estadísticas', { id: toastId })
    }
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const usagePercentage = (storageInfo.used / storageInfo.limit) * 100

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="w-12 h-12 border-4 border-dashboard-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Calculando métricas...</p>
      </div>
    )
  }
  return (
    <div className="animate-fade-up">
      <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="w-full lg:w-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-dashboard-text tracking-tight">Tablero de Control</h2>
          <p className="text-dashboard-text-muted mt-1 font-medium text-sm lg:text-base">Tráfico y almacenamiento del sistema.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
          <button 
            onClick={handleResetStats}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-red-100 text-red-500 font-bold rounded-2xl shadow-sm hover:bg-red-50 transition-all text-[10px] sm:text-xs"
          >
            <FiRefreshCw />
            <span>Reiniciar</span>
          </button>
          <button 
            onClick={() => { setShowContribs(true); fetchContribs() }}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-soft-green text-dashboard-text font-bold rounded-2xl shadow-sm hover:border-dashboard-primary/30 transition-all text-[10px] sm:text-xs relative"
          >
            <FiZap className="text-dashboard-primary" />
            <span>Aportes</span>
            {contribs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-bounce">
                {contribs.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => { setShowSupportHistory(true); fetchSupportLogs() }}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-soft-green text-dashboard-text font-bold rounded-2xl shadow-sm hover:border-dashboard-primary/30 transition-all text-[10px] sm:text-xs relative"
          >
            <FaTelegramPlane className="text-[#636b2f]" />
            <span>Soporte</span>
            {unrepliedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#636b2f] text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">
                {unrepliedCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => { setShowLogs(true); fetchLogs() }}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-soft-green text-dashboard-text font-bold rounded-2xl shadow-sm hover:border-dashboard-primary/30 transition-all text-[10px] sm:text-xs"
          >
            <FiList className="text-dashboard-primary" />
            <span>Lista</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
        <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-soft">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Archivos</p>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl lg:text-4xl font-extrabold text-dashboard-text">{totals.docs + totals.mtos}</h3>
            <span className="text-xs font-bold text-dashboard-primary pb-1">items</span>
          </div>
        </div>
        <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-soft">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Descargas</p>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl lg:text-4xl font-extrabold text-dashboard-text">{totals.downloads}</h3>
            <span className="text-xs font-bold text-dashboard-primary pb-1">total</span>
          </div>
        </div>
        <div className="md:col-span-2 bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-soft flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Almacenamiento</p>
            <span className="text-xs font-bold text-dashboard-text">{formatSize(storageInfo.used)} / 1 GB</span>
          </div>
          <div className="w-full h-3 bg-slate-50 rounded-full border border-slate-100 overflow-hidden">
            <div className="h-full bg-dashboard-primary transition-all duration-1000" style={{ width: `${usagePercentage}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-soft overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-extrabold text-dashboard-text flex items-center gap-3"><FiTrendingUp className="text-dashboard-primary" /> Top Consultas</h3>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ranking Global</span>
          </div>
          <div className="p-6 space-y-3">
            {mostDownloaded.map((doc, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs font-black text-slate-400">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-dashboard-text truncate">{doc.title}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronizado por {doc.user}</p>
                </div>
                <div className="px-4 py-1.5 bg-dashboard-primary/10 text-dashboard-primary rounded-lg text-xs font-black"><FiDownload className="inline mr-1" /> {doc.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-soft overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-extrabold text-dashboard-text flex items-center gap-3"><FiUsers className="text-dashboard-primary" /> Actividad de Usuarios</h3>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contribuyentes</span>
          </div>
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {userActivity.map((user, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-dashboard-primary text-xl shadow-sm">{user.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-dashboard-text truncate">{user.name}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activo</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200/50 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aportes</span>
                  <span className="text-xl font-black text-dashboard-primary">{user.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showLogs && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 lg:p-10 pt-10 lg:pt-16 animate-fade-in">
          <div className="absolute inset-0 bg-dashboard-bg/80 backdrop-blur-md" onClick={() => setShowLogs(false)} />
          <div className="relative w-full max-w-5xl bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 lg:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white/50 relative">
              <div className="pr-12 sm:pr-0">
                <h3 className="text-xl sm:text-2xl font-extrabold text-dashboard-text flex items-center gap-3">
                  <FiActivity className="text-dashboard-primary" /> Lista de Actividad
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Conexiones y Descargas</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={handleExportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-dashboard-primary/10 text-dashboard-primary hover:bg-dashboard-primary hover:text-white rounded-2xl transition-all text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm">
                  <FiDownload /> PDF
                </button>
                <button onClick={handleClearAllLogs} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl transition-all text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm">
                  <FiTrash2 /> Limpiar
                </button>
              </div>
              <button onClick={() => setShowLogs(false)} className="absolute top-5 right-5 sm:relative sm:top-0 sm:right-0 p-3 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
                <FiX className="text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 lg:p-8 no-scrollbar">
              {loadingLogs ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-dashboard-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando registros...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-20">
                  <FiList className="mx-auto text-5xl text-slate-100 mb-4" />
                  <p className="text-slate-400 font-bold">No hay actividad registrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Actividad</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="bg-slate-50 group hover:bg-indigo-50 transition-all rounded-2xl">
                          <td className="px-6 py-5 first:rounded-l-2xl border-y border-slate-100">
                            <span className="text-xs font-bold text-slate-600">{new Date(log.connection_date).toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-5 border-y border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-dashboard-primary shadow-sm border border-slate-100">
                                {log.user_name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-extrabold text-dashboard-text">{log.user_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 border-y border-slate-100">
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${log.activity_type === 'login' ? 'text-green-500' : 'text-dashboard-primary'}`}>{log.activity_type}</span>
                              <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px] mt-1">{log.file_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 last:rounded-r-2xl border-y border-slate-100 text-right">
                            <button onClick={() => handleDeleteLog(log.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><FiTrash2 /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[1001] flex items-start justify-center p-6 pt-20 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-center">
          <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FiRefreshCw className="text-3xl" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">¿Reiniciar Estadísticas?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">Se borrarán todos los contadores de descargas y el historial de actividad.</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmResetStats} className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-all">Confirmar Reinicio</button>
              <button onClick={() => setShowResetModal(false)} className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl active:scale-95 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Support History Modal */}
      {showSupportHistory && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 lg:p-10 pt-10 lg:pt-16 animate-fade-in">
          <div className="absolute inset-0 bg-dashboard-bg/80 backdrop-blur-md" onClick={() => setShowSupportHistory(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-extrabold text-dashboard-text flex items-center gap-3"><FaTelegramPlane className="text-[#636b2f]" /> Mensajes de Soporte</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Historial de Consultas</p>
              </div>
              <button onClick={() => setShowSupportHistory(false)} className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm transition-all"><FiX className="text-xl" /></button>
            </div>
            <div className="flex-1 overflow-auto p-8 no-scrollbar space-y-6">
              {loadingSupport ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-[#636b2f] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : supportLogs.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-slate-400 font-bold">No hay mensajes de soporte</p>
                </div>
              ) : (
                supportLogs.map((log) => (
                  <div key={log.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] relative group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm border border-slate-100"><FiActivity className="text-[#636b2f]" /></div>
                        <div>
                          <p className="text-xs font-extrabold text-dashboard-text">{log.user_name}</p>
                          <p className="text-[9px] font-bold text-slate-400">{new Date(log.connection_date).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteLog(log.id, true)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><FiTrash2 /></button>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 text-sm text-slate-600 font-medium whitespace-pre-wrap mb-4 shadow-sm" dangerouslySetInnerHTML={{ __html: log.file_name }} />
                    
                    {replyingLogId === log.id ? (
                      <div className="space-y-3 animate-fade-up">
                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escribe tu respuesta aquí..." className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#636b2f] min-h-[100px] shadow-inner" />
                        <div className="flex gap-2">
                          <button onClick={() => handleReplySupport(log)} className="flex-1 py-3 bg-[#636b2f] text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-[#636b2f]/20">Enviar Respuesta</button>
                          <button onClick={() => setReplyingLogId(null)} className="px-6 py-3 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs uppercase tracking-widest">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setReplyingLogId(log.id)} className="w-full py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><FiEdit2 /> Responder a {log.user_name.split(' ')[0]}</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contributions Modal */}
      {showContribs && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 lg:p-10 pt-10 lg:pt-16 animate-fade-in">
          <div className="absolute inset-0 bg-dashboard-bg/80 backdrop-blur-md" onClick={() => setShowContribs(false)} />
          <div className="relative w-full max-w-5xl bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50 relative">
              <div>
                <h3 className="text-2xl font-extrabold text-dashboard-text flex items-center gap-3"><FiZap className="text-dashboard-primary" /> Aportes Pendientes</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Revisión y Aprobación</p>
              </div>
              <button onClick={() => setShowContribs(false)} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"><FiX className="text-xl" /></button>
            </div>
            <div className="flex-1 overflow-auto p-8 no-scrollbar">
              {loadingContribs ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-dashboard-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : contribs.length === 0 ? (
                <div className="text-center py-20">
                  <FiCheck className="mx-auto text-5xl text-green-500 mb-4" />
                  <p className="text-slate-400 font-bold">No hay aportes pendientes</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contribs.map((c) => (
                    <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm">
                      <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl text-dashboard-primary shadow-sm border border-slate-100"><FiFileText /></div>
                          <div className="flex gap-2">
                            <button onClick={() => handleDownloadContrib(c.file_url, c.file_name)} className="p-3 bg-white text-slate-400 hover:text-dashboard-primary rounded-xl border border-slate-100 shadow-sm transition-all" title="Ver archivo"><FiDownload /></button>
                            <button onClick={() => handleDeleteContrib(c.id)} className="p-3 bg-white text-slate-400 hover:text-red-500 rounded-xl border border-slate-100 shadow-sm transition-all" title="Rechazar"><FiTrash2 /></button>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-dashboard-text mb-2 truncate" title={c.file_name}>{c.file_name}</h4>
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-6 h-6 bg-dashboard-primary/10 rounded-full flex items-center justify-center text-[8px] font-black text-dashboard-primary uppercase tracking-widest">{c.user_name?.charAt(0)}</div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.user_name}</p>
                        </div>
                        {editingContribId === c.id ? (
                          <div className="mb-6 space-y-3">
                            <textarea value={editContribComment} onChange={e => setEditContribComment(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs outline-none focus:border-dashboard-primary min-h-[80px]" />
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdateContribComment(c.id)} className="flex-1 py-2 bg-dashboard-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl">Guardar</button>
                              <button onClick={() => setEditingContribId(null)} className="px-4 py-2 bg-white text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-slate-100">X</button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => { setEditingContribId(c.id); setEditContribComment(c.comment || ''); }} className="mb-6 p-4 bg-white/50 border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:bg-white transition-all">
                            <p className="text-xs font-medium text-slate-500 italic line-clamp-2">{c.comment || 'Haz clic para añadir descripción...'}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mt-auto">
                          <button onClick={() => openApproveModal(c, 'mto')} className="py-3 bg-white border border-slate-200 text-dashboard-text font-black text-[8px] uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all">A MTO</button>
                          <button onClick={() => openApproveModal(c, 'biblioteca')} className="py-3 bg-dashboard-primary text-white font-black text-[8px] uppercase tracking-widest rounded-xl shadow-lg shadow-dashboard-primary/20 hover:scale-105 transition-all">Biblioteca</button>
                          <button onClick={() => openApproveModal(c, 'extra')} className="py-3 bg-white border border-slate-200 text-dashboard-text font-black text-[8px] uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all">Extra</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Details Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[1001] flex items-start justify-center p-6 pt-10 lg:pt-20 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg p-10 rounded-[3rem] border border-slate-100 shadow-2xl animate-scale-in">
            <h3 className="text-2xl font-extrabold text-dashboard-text mb-2">Completar Publicación</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Ubicación: <span className="text-dashboard-primary">{approveTarget.toUpperCase()}</span></p>
            
            <div className="space-y-5">
              {approveTarget === 'mto' ? (
                <>
                  <div className="flex gap-4">
                    <div className="w-1/3">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Prefijo</label>
                      <input type="text" value={approveFormData.prefix} onChange={e => setApproveFormData({...approveFormData, prefix: e.target.value.toUpperCase()})} placeholder="EJ: MTO" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-dashboard-primary" />
                    </div>
                    <div className="w-2/3">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Número</label>
                      <input type="text" value={approveFormData.number} onChange={e => setApproveFormData({...approveFormData, number: e.target.value})} placeholder="0123/24" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-dashboard-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha de MTO</label>
                    <input type="date" value={approveFormData.date_mto} onChange={e => setApproveFormData({...approveFormData, date_mto: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-dashboard-primary" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cuerpo del Mensaje</label>
                    <textarea value={approveFormData.content} onChange={e => setApproveFormData({...approveFormData, content: e.target.value})} rows={4} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium outline-none focus:border-dashboard-primary font-mono" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Título del Documento</label>
                    <input type="text" value={approveFormData.title} onChange={e => setApproveFormData({...approveFormData, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-dashboard-primary" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descripción</label>
                    <textarea value={approveFormData.description} onChange={e => setApproveFormData({...approveFormData, description: e.target.value})} rows={4} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium outline-none focus:border-dashboard-primary" />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-10">
              <button onClick={() => setShowApproveModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
              <button onClick={handleApproveContrib} className="flex-1 py-4 bg-dashboard-primary text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-dashboard-primary/20 hover:scale-[1.02] transition-all">Publicar Ahora</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 z-[1001] flex items-start justify-center p-6 pt-20 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-center">
          <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">¿Eliminar Registro?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">Esta acción es irreversible.</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl active:scale-95 transition-all">Sí, eliminar</button>
              <button onClick={() => setShowConfirmDelete(false)} className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl active:scale-95 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmClearAll && (
        <div className="fixed inset-0 z-[1001] flex items-start justify-center p-6 pt-20 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-center">
          <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">¿Vaciar Todo?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">Se borrará todo el historial de actividad permanentemente.</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmClearAll} className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl active:scale-95 transition-all">Confirmar Borrado Masivo</button>
              <button onClick={() => setShowConfirmClearAll(false)} className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl active:scale-95 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}
