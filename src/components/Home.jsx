import { useState, useEffect } from 'react'
import { supabase, sendTelegramNotification, logActivity } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FiBook, FiShield, FiFileText, FiClock, FiArrowRight, FiActivity, FiSearch, FiX, FiDownload, FiZap, FiPlayCircle, FiMessageSquare, FiUpload, FiSend, FiMapPin } from 'react-icons/fi'
import toast from 'react-hot-toast'
import videoTutorial from '../../video intructivo.mp4'
import posterImage from '../../logovideo.jpeg'
import Footer from './Footer'

export default function Home({ setActiveView }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [visibleItems, setVisibleItems] = useState({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-id')
          if (entry.isIntersecting) {
            setVisibleItems(prev => ({ ...prev, [id]: true }))
          } else {
            setVisibleItems(prev => ({ ...prev, [id]: false }))
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('.reveal-on-scroll')
    elements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        toast.success('¡Instalación iniciada!')
        setDeferredPrompt(null)
      }
    } else {
      setShowInstallHelp(true)
    }
  }

  const downloadWindowsShortcut = () => {
    const shortcutContent = `[InternetShortcut]\nURL=${window.location.origin}\nIconFile=${window.location.origin}/favicon.ico\nIconIndex=0`
    const blob = new Blob([shortcutContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Biblioteca_Virtual.url'
    link.click()
    toast.success('Acceso directo con logo descargado')
  }

  useEffect(() => {
    if (results) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [results])

  const executeSearch = async (e) => {
    if (e) e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    if (!supabase) {
      toast.error('Sistema de búsqueda no disponible')
      setSearching(false)
      return
    }

    try {
      const { data: docs, error: err1 } = await supabase
        .from('documents')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)

      const { data: mtos, error: err2 } = await supabase
        .from('mto_recibidos')
        .select('*')
        .or(`prefix.ilike.%${query}%,content.ilike.%${query}%,number.ilike.%${query}%`)

      if (err1 || err2) throw new Error('Error en la búsqueda')
      setResults({ docs: docs || [], mtos: mtos || [] })
    } catch (err) {
      toast.error('Error al buscar resultados')
    }
    setSearching(false)
  }

  const handleDownload = async (url, name, id, type = 'doc') => {
    if (!url) return
    const toastId = toast.loading('Descargando...')
    try {
      if (id && supabase) {
        const table = type === 'doc' ? 'documents' : 'mto_recibidos'
        supabase.from(table).select('download_count').eq('id', id).single().then(({ data }) => {
          if (data) {
            supabase.from(table).update({ download_count: (data.download_count || 0) + 1 }).eq('id', id)
          }
        })
        sendTelegramNotification(`🔍 <b>Búsqueda:</b> ${name}\n👤 Usuario: <b>${user?.nickname}</b> (<code>${user?.username}</code>)`)
        logActivity(user?.nickname || user?.username, 'download', name)
      }
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = name || 'archivo.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Descarga completada', { id: toastId })
    } catch (err) {
      window.open(url, '_blank')
      toast.dismiss(toastId)
    }
  }

  const quickActions = [
    { id: 'library', label: 'Biblioteca EF', desc: 'Reglamentos y manuales generales', icon: FiBook },
    { id: 'all', label: 'Documentación Extra', desc: 'Documentación oficial adicional', icon: FiShield },
    { id: 'mto', label: 'MTOs Recibidos', desc: 'Mensajes de tráfico oficial', icon: FiClock },
    { id: 'gna', label: 'Unidades de GNA', desc: 'Mapa interactivo de despliegue nacional', icon: FiMapPin },
  ]

  return (
    <>
      <div className="animate-fade-up">
      {/* Hero Section */}
      <div className="mb-10 pt-10 pb-4 px-6 sm:pt-14 sm:pb-8 sm:px-10 lg:p-14 bg-white rounded-[3rem] border border-slate-200 shadow-card relative overflow-hidden group">
        <div className="relative z-10 max-w-4xl">
          <span className="px-4 py-1.5 bg-indigo-50 text-dashboard-primary text-[10px] font-black rounded-xl uppercase tracking-widest mb-6 inline-block">Búsqueda Inteligente</span>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-dashboard-text tracking-tight leading-tight mb-6">
            Encuentra lo que necesitas en <span className="text-dashboard-primary italic">segundos.</span>
          </h2>
          <p className="text-slate-500 text-sm lg:text-lg font-medium mb-10 leading-relaxed max-w-2xl">
            Accede a la base de datos completa de reglamentos, mensajes oficiales y documentación desde nuestro sistema de biblioteca virtual.
          </p>
          
          <form onSubmit={executeSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-dashboard-primary transition-colors" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar reglamentos, MTOs..."
                className="w-full pl-12 pr-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-dashboard-primary focus:ring-4 focus:ring-dashboard-primary/5 transition-all font-medium text-sm shadow-inner"
              />
            </div>
            <button type="submit" className="px-10 py-4 bg-dashboard-primary text-white font-bold rounded-2xl shadow-xl shadow-dashboard-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all text-sm flex items-center justify-center gap-2 border border-dashboard-primary/10">
              {searching ? 'Buscando...' : 'Buscar ahora'}
            </button>
          </form>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute right-[-5%] top-[-10%] w-64 h-64 bg-indigo-50 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
      </div>

      {/* Grid Actions */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-dashboard-text tracking-tight">Acciones Rápidas</h3>
          <button 
            onClick={() => setActiveView('todo')}
            className="text-sm font-bold text-dashboard-primary hover:underline"
          >
            Ver Todo
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((item, index) => (
            <button
              key={item.id}
              data-id={item.id}
              onClick={() => setActiveView(item.id)}
              className={`group bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-dashboard-primary/20 hover:shadow-2xl hover:shadow-dashboard-primary/10 transition-all text-left shadow-card relative overflow-hidden reveal-on-scroll ${visibleItems[item.id] ? 'is-visible' : ''}`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-dashboard-primary mb-6 group-hover:bg-dashboard-primary group-hover:text-white transition-all border border-slate-50">
                <item.icon className="text-xl sm:text-2xl" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-dashboard-text mb-2">{item.label}</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{item.desc}</p>
              
              <div className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiArrowRight className="text-dashboard-primary" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Download App Section */}
      <div className="mb-16">
        <button 
          onClick={handleInstallClick}
          className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 p-6 sm:p-10 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2rem] sm:rounded-[3rem] text-white shadow-2xl relative overflow-hidden group"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 relative z-10 text-center sm:text-left">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform border border-white/20">
              <FiDownload className="text-2xl sm:text-3xl" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Acceso a la Plataforma</p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Instalar Aplicación</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">Lleva la biblioteca contigo a todas partes.</p>
            </div>
          </div>
          <div className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 px-6 py-4 sm:py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10 border border-white/10">
            Instalar ahora <FiArrowRight className="text-lg group-hover:translate-x-2 transition-transform" />
          </div>
          
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent skew-x-12 translate-x-1/4" />
        </button>
      </div>


      {/* Video Section */}
      <div className={`mb-12 reveal-on-scroll ${visibleItems['video-section'] ? 'is-visible' : ''}`} data-id="video-section">
        <h3 className="text-xl sm:text-2xl font-bold text-dashboard-text tracking-tight mb-8">Tutorial Destacado</h3>
        <div className="bg-white border border-slate-200 shadow-card rounded-[3rem] overflow-hidden">
          <div className="flex flex-col lg:grid lg:grid-cols-2">
            <div className="aspect-video relative bg-slate-900 w-full group/video">
              <video 
                src={videoTutorial} 
                poster={posterImage}
                controls 
                playsInline
                preload="none"
                className="w-full h-full object-contain"
              >
                Su navegador no soporta el tag de video.
              </video>
            </div>
            <div className="p-10 lg:p-14 flex flex-col justify-center items-start">
              <div className="flex items-center gap-2 text-dashboard-primary mb-4">
                <FiPlayCircle className="text-xl" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Manual Destacado</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-dashboard-text mb-4 tracking-tight">Manual Interactivo: Acreditación Técnica</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                Guía visual detallada sobre los procedimientos fundamentales para la acreditación técnica según la normativa vigente PON 6/25.
              </p>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xl font-bold text-dashboard-text">02:07</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duración</p>
                </div>
                <div className="w-[1px] h-8 bg-slate-100"></div>
                <div>
                  <p className="text-xl font-bold text-dashboard-text">HD</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Calidad</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Section */}
      <ContributionSection user={user} visibleItems={visibleItems} />
      </div>

      {/* Search Results Modal */}
      {results && (
        <div className="fixed inset-0 z-[999] flex items-start justify-center pt-10 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setResults(null)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-fit max-h-[calc(100vh-80px)] border border-slate-200">
            <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-slate-100/50">
              <div>
                <h3 className="text-xl font-bold text-dashboard-text tracking-tight">Resultados de Búsqueda</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">"{query}" • {results.docs.length + results.mtos.length} coincidencias</p>
              </div>
              <button onClick={() => setResults(null)} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-dashboard-primary rounded-xl transition-all shadow-sm"><FiX className="text-xl" /></button>
            </div>
            
            <div className="overflow-y-auto p-8 space-y-8 no-scrollbar">
              {results.docs.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-black text-dashboard-primary uppercase tracking-[0.2em] mb-4">Documentos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.docs.map(doc => (
                      <div key={doc.id} className="p-5 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-dashboard-primary transition-all">
                        <div className="min-w-0 pr-4">
                          <h5 className="font-bold text-dashboard-text text-sm truncate">{doc.title}</h5>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mt-1">{doc.category.replace('_', ' ')}</p>
                        </div>
                        <button onClick={() => handleDownload((doc.file_urls || [doc.file_url])[0], (doc.file_names || [doc.file_name])[0], doc.id, 'doc')} className="flex-shrink-0 p-3 bg-white rounded-xl text-dashboard-primary border border-slate-200 hover:bg-dashboard-primary hover:text-white transition-all shadow-sm"><FiDownload /></button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {results.mtos.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-black text-dashboard-accent uppercase tracking-[0.2em] mb-4">Official Messages (MTO)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {results.mtos.map(mto => (
                      <div key={mto.id} className="p-5 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-dashboard-accent transition-all">
                        <div className="min-w-0">
                          <h5 className="font-bold text-dashboard-text text-sm truncate">MTO {mto.number}</h5>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mt-1">{mto.prefix}</p>
                        </div>
                        <button onClick={() => handleDownload((mto.file_urls || [mto.file_url])[0], (mto.file_names || [mto.file_name])[0], mto.id, 'mto')} className="p-3 bg-white rounded-xl text-dashboard-accent border border-slate-200 hover:bg-dashboard-accent hover:text-white transition-all shadow-sm"><FiDownload /></button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {results.docs.length === 0 && results.mtos.length === 0 && (
                <div className="text-center py-10"><p className="text-slate-400 italic">No se encontraron resultados para esta búsqueda.</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Install Help Modal */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowInstallHelp(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10 border border-slate-200">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-dashboard-primary mx-auto mb-6">
                <FiDownload className="text-4xl" />
              </div>
              <h3 className="text-2xl font-bold text-dashboard-text tracking-tight mb-2">Instalación Manual</h3>
              <p className="text-xs text-slate-400 font-medium">Si la descarga automática no inició, sigue estos pasos:</p>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-dashboard-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-dashboard-primary text-white rounded-full flex items-center justify-center text-[8px]">1</span> iPhone / iOS (Safari)
                </p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Tap the <b>Share</b> button and select <b>"Add to Home Screen"</b>.
                </p>
              </div>

              <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-400 text-white rounded-full flex items-center justify-center text-[8px]">2</span> Android / Chrome
                </p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Tap the <b>three dots</b> and select <b>"Install app"</b> or <b>"Add to Home screen"</b>.
                </p>
              </div>

              <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-400 text-white rounded-full flex items-center justify-center text-[8px]">3</span> Windows Desktop
                </p>
                <button 
                  onClick={downloadWindowsShortcut}
                  className="w-full mt-2 py-4 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-dashboard-primary hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <FiDownload /> Descargar acceso directo
                </button>
              </div>
            </div>

            <button 
              onClick={() => setShowInstallHelp(false)}
              className="w-full mt-10 py-5 bg-dashboard-primary text-white font-bold rounded-2xl shadow-xl shadow-dashboard-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      <Footer />
    </>
  )
}

function ContributionSection({ user, visibleItems }) {
  const [comment, setComment] = useState('')
  const [file, setFile] = useState(null)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!comment.trim() && !file) {
      return toast.error('Por favor agrega un comentario o sube un archivo')
    }
    
    setSending(true)
    const toastId = toast.loading('Enviando aporte...')
    
    try {
      let fileUrl = null
      let fileName = null

      if (file) {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
        const name = `${Date.now()}_${cleanName}`
        
        const { data, error: storageError } = await supabase.storage
          .from('pdfs')
          .upload(`contributions/${name}`, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (storageError) throw new Error(`Upload error: ${storageError.message}`)

        const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(`contributions/${name}`)
        fileUrl = publicUrl
        fileName = file.name
      }

      const { error: dbError } = await supabase.from('contributions').insert({
        user_name: user?.nickname || user?.username || 'Anonymous User',
        comment,
        file_url: fileUrl,
        file_name: fileName,
        status: 'pending'
      })

      if (dbError) throw new Error(`Database error: ${dbError.message}`)

      toast.success('¡Gracias! Tu aporte ha sido enviado para revisión.', { id: toastId })
      setComment('')
      setFile(null)
    } catch (err) {
      toast.error(err.message || 'Error al enviar aporte', { id: toastId })
    }
    setSending(false)
  }

  return (
    <div className={`mt-16 mb-20 reveal-on-scroll ${visibleItems['contribution-section'] ? 'is-visible' : ''}`} data-id="contribution-section">
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        <div className="lg:w-1/3">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-dashboard-primary">
              <FiZap className="text-2xl" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-dashboard-text tracking-tight">Colaborar</h3>
          </div>
          <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
            ¿Tienes material que podría ser útil para la biblioteca? Envía tus reglamentos, manuales o mensajes oficiales aquí.
          </p>
          <div className="p-8 bg-slate-100 rounded-[2rem] border border-slate-200 shadow-inner">
            <p className="text-[10px] font-black text-dashboard-primary uppercase tracking-[0.2em] mb-3">Proceso de Revisión</p>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">Todos los archivos son analizados para verificar su autenticidad antes de ser visibles para todos.</p>
          </div>
        </div>

        <div className="lg:w-2/3 w-full bg-white rounded-[3rem] border border-slate-50 p-10 lg:p-14 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                <FiMessageSquare className="text-dashboard-primary" /> Tu Comentario o Descripción
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe brevemente lo que estás enviando..."
                className="w-full p-6 bg-slate-100 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-dashboard-primary transition-all font-medium text-sm min-h-[150px] resize-none shadow-inner"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="flex-1 w-full">
                <label className="flex items-center justify-center gap-3 w-full p-5 border-2 border-dashed border-slate-200 rounded-2xl hover:border-dashboard-primary hover:bg-indigo-50/30 transition-all cursor-pointer group relative overflow-hidden">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx"
                  />
                  <FiUpload className={`text-2xl ${file ? 'text-dashboard-primary' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-500 truncate max-w-[250px]">
                    {file ? file.name : 'Subir archivo (PDF, DOC)'}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto px-12 py-5 bg-dashboard-primary text-white font-bold rounded-2xl shadow-xl shadow-dashboard-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 border border-dashboard-primary/10"
              >
                <FiSend className="text-lg" />
                {sending ? 'Enviando...' : 'Enviar Ahora'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
