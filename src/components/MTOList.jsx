import { useState, useEffect } from 'react'
import { supabase, sendTelegramNotification, logActivity } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FiSearch, FiDownload, FiShare2, FiTrash2, FiFileText, FiX, FiExternalLink, FiAlertTriangle, FiEdit2, FiClock, FiUpload, FiMaximize2, FiEye } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Footer from './Footer'

export default function MTOList() {
  const { user, isAdmin } = useAuth()
  const [mtos, setMtos] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedMto, setSelectedMto] = useState(null)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [mtoToDelete, setMtoToDelete] = useState(null)

  // Edición
  const [editingMto, setEditingMto] = useState(null)
  const [editPrefix, setEditPrefix] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate] = useState('')
  const [newFiles, setNewFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [editCategory, setEditCategory] = useState('mto')
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    if (selectedMto || mtoToDelete) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [selectedMto, mtoToDelete])

  useEffect(() => { fetchMtos() }, [])

  const fetchMtos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('mto_recibidos').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setMtos(data || [])
    } catch (err) {
      toast.error('Error al cargar MTOs')
    }
    setLoading(false)
  }

  const filteredMtos = mtos.filter(m => {
    const q = (searchQuery || "").toLowerCase().trim()
    if (!q) return true
    const prefix = (m.prefix || "").toLowerCase()
    const number = (m.number || "").toLowerCase()
    const content = (m.content || "").toLowerCase()
    return prefix.includes(q) || number.includes(q) || content.includes(q)
  })

  const confirmDelete = async () => {
    if (!mtoToDelete) return
    const toastId = toast.loading('Eliminando MTO...')
    try {
      if (mtoToDelete.file_urls && mtoToDelete.file_urls.length > 0) {
        try {
          const paths = mtoToDelete.file_urls.map(url => {
            if (url.includes('/pdfs/')) return url.split('/pdfs/')[1]
            return null
          }).filter(p => p)
          
          if (paths.length > 0) {
            const { error: storageErr } = await supabase.storage.from('pdfs').remove(paths)
            if (storageErr) console.warn('No se pudieron borrar algunos archivos físicos:', storageErr)
          }
        } catch (sErr) {
          console.warn('Error al procesar rutas de archivos:', sErr)
        }
      }

      const { error } = await supabase.from('mto_recibidos').delete().eq('id', mtoToDelete.id)
      if (error) throw error

      setMtos(prev => prev.filter(m => m.id !== mtoToDelete.id))
      toast.success('MTO eliminado correctamente', { id: toastId })
      setMtoToDelete(null)
      setSelectedMto(null)
    } catch (err) {
      console.error('Error al eliminar MTO:', err)
      toast.error('Error: ' + (err.message || 'No se pudo eliminar el registro'), { id: toastId })
    }
  }

  const handleDownload = async (url, name, mtoId) => {
    if (!url) return toast.error('URL no válida')
    const toastId = toast.loading('Descargando archivo...')
    try {
      if (mtoId) {
        supabase.from('mto_recibidos').select('download_count').eq('id', mtoId).single().then(({ data }) => {
          if (data) {
            supabase.from('mto_recibidos').update({ download_count: (data.download_count || 0) + 1 }).eq('id', mtoId).then(() => {
              setMtos(prev => prev.map(m => m.id === mtoId ? { ...m, download_count: (m.download_count || 0) + 1 } : m))
            })
          }
        })
        sendTelegramNotification(`✉️ <b>MTO:</b> ${name}\n👤 Usuario: <b>${user?.nickname}</b> (<code>${user?.username}</code>)`)
        logActivity(user?.nickname || user?.username, 'download', name)
      }
      
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = name || 'mto.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('MTO guardado en el equipo', { id: toastId })
    } catch (err) {
      window.open(url, '_blank')
      toast.dismiss(toastId)
    }
  }

  const handleShare = async (e, mto) => {
    e.stopPropagation()
    const toastId = toast.loading('Preparando MTO para compartir...')
    try {
      const urls = mto.file_urls || (mto.file_url ? [mto.file_url] : [])
      const names = mto.file_names || (mto.file_name ? [mto.file_name] : [])
      
      const files = []
      for (let i = 0; i < urls.length; i++) {
        try {
          const response = await fetch(urls[i])
          const blob = await response.blob()
          const fileName = names[i] || `MTO_${mto.prefix}_${mto.number}_${i + 1}.pdf`
          files.push(new File([blob], fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`, { type: 'application/pdf' }))
        } catch (fetchErr) {
          console.warn(`No se pudo cargar el archivo ${urls[i]}:`, fetchErr)
        }
      }

      const shareText = `✉️ *MTO: ${mto.prefix} ${mto.number}*\n📅 Fecha: ${mto.date_mto}\n\n*CUERPO DEL MENSAJE:*\n${mto.content}\n\nConsulta este MTO en nuestra biblioteca virtual.`

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files: files,
          title: `MTO ${mto.prefix} ${mto.number}`,
          text: shareText
        })
        toast.success('Compartiendo MTO...', { id: toastId })
      } else {
        let fileLinksText = ''
        if (urls.length > 0) {
          fileLinksText = '\n\n*ADJUNTOS:*'
          urls.forEach((url, i) => {
            fileLinksText += `\n📄 ${names[i] || 'Archivo'}: ${url}`
          })
        }
        
        const fullText = encodeURIComponent(shareText + fileLinksText)
        window.open(`https://wa.me/?text=${fullText}`, '_blank')
        toast.success('Abriendo WhatsApp...', { id: toastId })
      }
    } catch (err) {
      console.error('Error sharing MTO:', err)
      toast.error('No se pudo procesar el MTO para compartir', { id: toastId })
    }
  }

  const handleExportPDF = async (mto) => {
    if (!mto) return toast.error('No hay datos para exportar')
    const html2pdf = window.html2pdf
    if (!html2pdf) return toast.error('Servicio de PDF no disponible. Reintente en unos segundos.')
    
    const toastId = toast.loading('Generando PDF...')
    try {
      const element = document.createElement('div')
      element.innerHTML = `
        <div style="padding: 40px; font-family: Arial, sans-serif; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2149b1; padding-bottom: 20px;">
            <h1 style="color: #2149b1; font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase;">Mensaje de Tráfico Oficial</h1>
            <p style="color: #64748b; font-size: 10px; margin-top: 5px;">SISTEMA DE BIBLIOTECA VIRTUAL</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%;">
                  <p style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; margin: 0;">Referencia MTO</p>
                  <p style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 5px 0 0 0;">${mto.prefix} ${mto.number}</p>
                </td>
                <td style="width: 50%; text-align: right;">
                  <p style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; margin: 0;">Fecha de Emisión</p>
                  <p style="font-size: 14px; font-weight: bold; color: #1e293b; margin: 5px 0 0 0;">${mto.date_mto}</p>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 15px;">Cuerpo del Mensaje</p>
            <div style="font-size: 12px; color: #334155; white-space: pre-wrap; line-height: 1.5; font-family: monospace;">${mto.content}</div>
          </div>
          
          <div style="margin-top: 50px; border-top: 1px solid #f1f5f9; text-align: center; padding-top: 20px;">
            <p style="font-size: 8px; color: #94a3b8;">Documento digital generado por Sistema de Gestión de Biblioteca.</p>
          </div>
        </div>
      `
      
      const opt = {
        margin: 10,
        filename: `MTO_${mto.prefix}_${mto.number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }
      
      html2pdf().from(element).set(opt).save().then(() => {
        toast.success('MTO descargado', { id: toastId })
      }).catch(err => {
        throw err
      })
    } catch (err) {
      console.error(err)
      toast.error('Error al descargar el PDF', { id: toastId })
    }
  }

  const handleSaveEdit = async () => {
    setIsUploading(true)
    const toastId = toast.loading('Actualizando...')
    try {
      let finalUrls = [...(selectedMto.file_urls || (selectedMto.file_url ? [selectedMto.file_url] : []))]
      let finalNames = [...(selectedMto.file_names || (selectedMto.file_name ? [selectedMto.file_name] : []))]

      if (newFiles.length > 0) {
        for (const file of newFiles) {
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`
          await supabase.storage.from('pdfs').upload(fileName, file)
          const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(fileName)
          finalUrls.push(publicUrl)
          finalNames.push(file.name)
        }
      }

      if (editCategory !== 'mto') {
        await supabase.from('documents').insert({
          title: editTitle,
          description: editDescription || selectedMto.content,
          category: editCategory,
          file_urls: finalUrls,
          file_names: finalNames,
          uploader_name: selectedMto.uploader_name,
          download_count: selectedMto?.download_count || 0
        })
        await supabase.from('mto_recibidos').delete().eq('id', editingMto)
        setMtos(prev => prev.filter(m => m.id !== editingMto))
        setSelectedMto(null)
        toast.success('Movido correctamente', { id: toastId })
      } else {
        await supabase.from('mto_recibidos').update({
          prefix: editPrefix.toUpperCase(),
          number: editNumber,
          content: editContent,
          date_mto: editDate,
          file_urls: finalUrls,
          file_names: finalNames
        }).eq('id', editingMto)
        
        setMtos(mtos.map(m => m.id === editingMto ? { ...m, prefix: editPrefix.toUpperCase(), number: editNumber, content: editContent, date_mto: editDate, file_urls: finalUrls, file_names: finalNames } : m))
        setSelectedMto({ ...selectedMto, prefix: editPrefix.toUpperCase(), number: editNumber, content: editContent, date_mto: editDate, file_urls: finalUrls, file_names: finalNames })
        toast.success('Actualizado', { id: toastId })
      }
      setEditingMto(null)
      setNewFiles([])
    } catch (err) {
      toast.error('Error: ' + err.message, { id: toastId })
    }
    setIsUploading(false)
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-6 lg:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 lg:gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl lg:text-3xl font-bold text-dashboard-text tracking-tight capitalize leading-tight">
            MTOs Recibidos
          </h2>
          <p className="text-slate-400 mt-1 font-medium text-sm">
            Busca y gestiona los mensajes de tráfico oficial recibidos.
          </p>
        </div>
        
        <div className="relative group w-full md:min-w-[300px] md:w-auto">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-dashboard-primary transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en MTOs..."
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-dashboard-primary/5 focus:border-dashboard-primary transition-all font-medium text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse" />)}
        </div>
      ) : filteredMtos.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-200 shadow-card">
          <FiFileText className="mx-auto text-6xl text-slate-100 mb-6" />
          <p className="text-slate-400 font-bold text-lg">No se encontraron mensajes</p>
          <p className="text-slate-300 text-sm mt-2 font-medium">
            Intenta ajustar tu búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredMtos.map((mto) => (
            <div 
              key={mto.id} 
              onClick={() => { setSelectedMto(mto); setCurrentFileIndex(0); }}
              className="group bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-dashboard-primary/20 hover:shadow-2xl hover:shadow-dashboard-primary/10 transition-all duration-500 cursor-pointer animate-fade-up shadow-card"
            >
              <div className="p-8 pb-0">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-dashboard-primary mb-6 group-hover:bg-dashboard-primary group-hover:text-white transition-all duration-500">
                  <FiClock className="text-2xl" />
                </div>
                <div className="flex flex-col gap-1 mb-3">
                  <span className="text-[10px] font-black text-dashboard-primary uppercase tracking-[0.2em]">MTO {mto.prefix}</span>
                  <h3 className="text-lg font-bold text-dashboard-text leading-tight group-hover:text-dashboard-primary transition-colors">
                    N° {mto.number}
                  </h3>
                </div>
                <p className="text-slate-400 text-xs font-medium line-clamp-3 leading-relaxed mb-6">
                  {mto.content}
                </p>
              </div>

              <div className="mt-auto p-8 pt-6 flex items-center justify-between border-t border-slate-50 bg-slate-100/30">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mto.file_urls?.length || 0} Archivos</span>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => handleShare(e, mto)} 
                    className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-green-100"
                    title="Compartir MTO"
                  >
                    <FiShare2 />
                  </button>
                  {isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); setMtoToDelete(mto) }} className="text-slate-300 hover:text-red-500 transition-colors"><FiTrash2 /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMto && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-0 animate-fade-in">
          <div className="absolute inset-0 bg-dashboard-bg/80 backdrop-blur-md" onClick={() => { setSelectedMto(null); setEditingMto(null) }} />
          <div className="relative w-full max-w-6xl bg-white shadow-2xl overflow-hidden flex flex-col h-screen md:h-[85vh] md:mt-4 md:rounded-[3rem] border border-slate-200 animate-scale-in">
            <div className="p-5 sm:p-10 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-dashboard-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                  <FiFileText className="text-2xl" />
                </div>
                <div className="min-w-0 flex-1">
                  {editingMto ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input value={editPrefix} onChange={e => setEditPrefix(e.target.value)} placeholder="Prefijo" className="w-20 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-dashboard-primary/10" />
                        <input value={editNumber} onChange={e => setEditNumber(e.target.value)} placeholder="Número" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-dashboard-primary/10" />
                      </div>
                      <select 
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-600 outline-none focus:ring-4 focus:ring-amber-500/10"
                      >
                        <option value="mto">Mensaje de Tráfico (MTO)</option>
                        <option value="educacion_fisica">Biblioteca Educación Física</option>
                        <option value="extra">Documentación Extra</option>
                      </select>
                      {editCategory !== 'mto' && (
                        <div className="space-y-2 animate-fade-in">
                          <input 
                            value={editTitle} 
                            onChange={e => setEditTitle(e.target.value)} 
                            placeholder="Título para la biblioteca" 
                            className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-4 focus:ring-dashboard-primary/10"
                          />
                          <textarea 
                            value={editDescription} 
                            onChange={e => setEditDescription(e.target.value)} 
                            placeholder="Descripción (opcional)" 
                            className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:ring-4 focus:ring-dashboard-primary/10"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-xl font-extrabold text-dashboard-text tracking-tight leading-tight" title={`${selectedMto.prefix} ${selectedMto.number}`}>
                        {selectedMto.prefix} <span className="text-dashboard-primary">{selectedMto.number}</span>
                      </h2>
                      <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Vista Previa MTO • GNA</p>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => { setSelectedMto(null); setEditingMto(null) }} 
                className="p-2.5 sm:p-3 bg-white border border-slate-100 text-slate-400 hover:text-dashboard-primary hover:border-dashboard-primary rounded-2xl transition-all shadow-sm active:scale-90 shrink-0 ml-4 group"
              >
                <FiX className="text-xl group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Lado Izquierdo: Visualizador PDF o Cuerpo del Mensaje (Solo Desktop para PDF) */}
              <div className="hidden lg:block lg:flex-1 bg-slate-100 relative overflow-hidden">
                {(selectedMto.file_urls?.length > 0 || selectedMto.file_url) ? (
                  <iframe 
                    key={`${selectedMto.id}-${currentFileIndex}`}
                    src={`${(selectedMto.file_urls || [selectedMto.file_url])[currentFileIndex]}#toolbar=0`} 
                    className="w-full h-full border-none"
                    title="Vista Previa PDF"
                  />
                ) : (
                  <div className="absolute inset-0 p-10 lg:p-20 overflow-y-auto no-scrollbar bg-white">
                    <div className="max-w-3xl mx-auto">
                      <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-100">
                        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                          <FiFileText className="text-2xl" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenido del Mensaje</p>
                          <h3 className="text-xl font-bold text-slate-900">MTO {selectedMto.prefix} {selectedMto.number}</h3>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 p-6 sm:p-12 rounded-[2rem] border border-slate-100 shadow-inner">
                        <div className="font-mono text-[11px] sm:text-sm lg:text-base text-slate-600 leading-[1.8] tracking-wide whitespace-pre-wrap selection:bg-dashboard-primary/20">
                          {selectedMto.content}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lado Derecho: Detalles y Acciones */}
              <div className="w-full lg:w-96 bg-white border-l border-slate-100 p-8 flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div className="space-y-8">
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-dashboard-primary uppercase tracking-[0.2em]">Cuerpo del Mensaje</h4>
                      {!editingMto && (
                        <button 
                          onClick={() => handleExportPDF(selectedMto)} 
                          className="text-[10px] font-bold uppercase text-white bg-dashboard-primary px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-dashboard-primary/20"
                        >
                          Generar PDF
                        </button>
                      )}
                    </div>
                    {editingMto && (
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={6} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:border-dashboard-primary transition-all font-mono shadow-inner" />
                    )}
                  </section>

                  <section>
                    {editingMto && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Añadir Archivos</h4>
                        <>
                          {newFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-indigo-50 border border-dashboard-primary/20 border-dashed rounded-xl animate-pulse">
                              <p className="text-[10px] font-bold text-dashboard-primary truncate">{file.name}</p>
                              <button onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-400"><FiX /></button>
                            </div>
                          ))}
                          <label className="flex items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-dashboard-primary hover:bg-indigo-50 transition-all cursor-pointer group">
                            <input type="file" multiple accept=".pdf" className="hidden" onChange={(e) => setNewFiles([...newFiles, ...Array.from(e.target.files)])} />
                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-dashboard-primary uppercase tracking-widest">+ Añadir Archivos</span>
                          </label>
                        </>
                      )}
                    </div>
                  </section>
                </div>

                <div className="flex-1" />

                <div className="mt-10 space-y-4">
                  <button 
                    onClick={(e) => handleShare(e, selectedMto)} 
                    className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <FaWhatsapp className="text-lg" /> Compartir en WhatsApp
                  </button>

                  {isAdmin && (
                    <div className="flex flex-col gap-3 mt-6">
                      {editingMto ? (
                        <button onClick={handleSaveEdit} disabled={isUploading} className="w-full py-5 bg-dashboard-primary text-white font-bold rounded-[2rem] shadow-xl shadow-dashboard-primary/20 hover:shadow-dashboard-primary/30 active:scale-95 transition-all text-sm tracking-widest uppercase">Guardar Cambios</button>
                      ) : (
                        <button 
                          onClick={() => { 
                            setEditingMto(selectedMto.id); 
                            setEditPrefix(selectedMto.prefix); 
                            setEditNumber(selectedMto.number); 
                            setEditContent(selectedMto.content); 
                            setEditDate(selectedMto.date_mto); 
                            setEditCategory('mto');
                            setEditTitle(`MTO ${selectedMto.prefix} ${selectedMto.number}`);
                            setEditDescription(selectedMto.content.substring(0, 200));
                          }} 
                          className="w-full py-5 bg-white border-2 border-slate-100 text-dashboard-primary hover:bg-dashboard-primary hover:text-white font-bold rounded-[2rem] text-sm transition-all flex items-center justify-center gap-2 tracking-widest uppercase shadow-sm"
                        >
                          <FiEdit2 className="text-lg" /> Editar Registro
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-6 border-t border-slate-100 text-center">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Al alcance de tus manos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mtoToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-6 pt-20 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-center">
          <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FiAlertTriangle className="text-3xl" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">¿Eliminar MTO?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">Esta acción borrará el mensaje y sus archivos permanentemente.</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-all">Confirmar Eliminación</button>
              <button onClick={() => setMtoToDelete(null)} className="w-full py-4 bg-slate-50 text-slate-400 font-bold rounded-2xl active:scale-95 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}
