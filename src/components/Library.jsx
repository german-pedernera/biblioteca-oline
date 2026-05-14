import { useState, useEffect } from 'react'
import { supabase, sendTelegramNotification, logActivity } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FiFileText, FiDownload, FiSearch, FiX, FiShare2, FiTrash2, FiExternalLink, FiMaximize2, FiEdit2 } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Footer from './Footer'

export default function Library({ category = 'educacion_fisica' }) {
  const { user, isAdmin } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [docToDelete, setDocToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  // Edición
  const [editingDoc, setEditingDoc] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState(category)
  const [editDate, setEditDate] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [category])

  useEffect(() => {
    if (selectedDoc) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [selectedDoc])

  async function fetchDocuments() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      toast.error('Error al cargar documentos')
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!docToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docToDelete.id)

      if (error) throw error
      setDocuments(documents.filter(d => d.id !== docToDelete.id))
      toast.success('Documento eliminado correctamente')
      setDocToDelete(null)
    } catch (err) {
      toast.error('Error al eliminar documento')
    }
    setIsDeleting(false)
  }

  const handleDownload = async (doc) => {
    const toastId = toast.loading('Preparando descarga...')
    try {
      await supabase.from('documents').update({ 
        download_count: (doc.download_count || 0) + 1 
      }).eq('id', doc.id)

      sendTelegramNotification(`📂 <b>Descarga:</b> ${doc.title}\n👤 Usuario: <b>${user?.nickname}</b> (<code>${user?.username}</code>)`)
      logActivity(user?.nickname || user?.username, 'download', doc.title)

      const url = (doc.file_urls || [doc.file_url])[0]
      const name = (doc.file_names || [doc.file_name])[0]

      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = name || 'documento.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Descarga completada', { id: toastId })
    } catch (err) {
      toast.error('Error al descargar', { id: toastId })
      window.open((doc.file_urls || [doc.file_url])[0], '_blank')
    }
  }

  const handleShare = (e, doc) => {
    e.stopPropagation()
    const text = `*Biblioteca Virtual GNA*\n\n📄 *Documento:* ${doc.title}\n📝 *Descripción:* ${doc.description}\n\n🔗 *Enlace:* ${(doc.file_urls || [doc.file_url])[0]}`
    const encodedText = encodeURIComponent(text)
    window.open(`https://wa.me/?text=${encodedText}`, '_blank')
    logActivity(user?.nickname || user?.username, 'share', doc.title)
  }

  const handleSaveEdit = async () => {
    if (!editingDoc) return
    const toastId = toast.loading('Guardando cambios...')
    setIsUploading(true)
    try {
      const isMovingToMto = editCategory === 'mto'
      
      if (isMovingToMto) {
        // Move from documents to mto_recibidos
        const { error: insErr } = await supabase.from('mto_recibidos').insert({
          prefix: 'MTO',
          number: 'S/N',
          content: editTitle + '\n\n' + editDescription,
          file_urls: selectedDoc.file_urls || [selectedDoc.file_url],
          file_names: selectedDoc.file_names || [selectedDoc.file_name],
          uploader_name: selectedDoc.uploader_name,
          date_mto: new Date().toISOString().split('T')[0]
        })
        if (insErr) throw insErr

        const { error: delErr } = await supabase.from('documents').delete().eq('id', editingDoc)
        if (delErr) throw delErr

        setDocuments(documents.filter(d => d.id !== editingDoc))
        setSelectedDoc(null)
        toast.success('Documento movido a MTO correctamente', { id: toastId })
      } else {
        // Just update or change category within documents table
        const { error } = await supabase
          .from('documents')
          .update({
            title: editTitle,
            description: editDescription,
            category: editCategory,
            created_at: editDate || selectedDoc.created_at
          })
          .eq('id', editingDoc)

        if (error) throw error
        
        if (editCategory !== category) {
          // If category changed, remove from current list
          setDocuments(documents.filter(d => d.id !== editingDoc))
          setSelectedDoc(null)
          toast.success('Documento movido de sección correctamente', { id: toastId })
        } else {
          setDocuments(documents.map(d => d.id === editingDoc ? { ...d, title: editTitle, description: editDescription, category: editCategory } : d))
          setSelectedDoc({ ...selectedDoc, title: editTitle, description: editDescription, category: editCategory })
          toast.success('Documento actualizado correctamente', { id: toastId })
        }
      }
      setEditingDoc(null)
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar documento', { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const q = (query || "").toLowerCase().trim()
    if (!q) return true
    const title = (doc.title || "").toLowerCase()
    const description = (doc.description || "").toLowerCase()
    return title.includes(q) || description.includes(q)
  })

  const title = category === 'educacion_fisica' ? 'Biblioteca Educación Física' : 'Documentación Extra'

  return (
    <div className="animate-fade-up">
      <div className="mb-6 sm:mb-10 bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-card relative overflow-hidden group">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2 sm:mb-4">
              <div className="w-10 h-10 bg-dashboard-primary rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                <FiFileText className="text-xl" />
              </div>
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-dashboard-text tracking-tight capitalize leading-tight">{title}</h2>
            </div>
            <p className="text-slate-400 font-medium text-[10px] sm:text-sm">
              Gestión de documentación oficial y recursos digitales de GNA.
            </p>
          </div>

          <div className="w-full lg:w-96 relative group">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-dashboard-primary transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar documentos..."
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-dashboard-primary/5 focus:border-dashboard-primary transition-all font-medium text-xs sm:text-sm shadow-inner"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-80 bg-white rounded-[2.5rem] border border-slate-50 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-200 shadow-card">
          <FiFileText className="mx-auto text-6xl text-slate-100 mb-6" />
          <p className="text-slate-400 font-bold text-lg">No se encontraron documentos</p>
          <p className="text-slate-300 text-sm mt-2 font-medium">
            Intenta ajustar tu búsqueda o categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-8">
          {filteredDocuments.map(doc => (
            <div 
              key={doc.id} 
              onClick={() => { setSelectedDoc(doc); setCurrentFileIndex(0); }}
              className="group bg-white border border-slate-200 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col hover:border-dashboard-primary/20 hover:shadow-2xl hover:shadow-dashboard-primary/10 transition-all duration-500 cursor-pointer animate-fade-up shadow-card"
            >
              <div className="p-6 sm:p-8 pb-4 sm:pb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-dashboard-primary mb-4 sm:mb-8 group-hover:bg-dashboard-primary group-hover:text-white transition-all duration-500 shadow-inner">
                  <FiFileText className="text-xl sm:text-3xl" />
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-dashboard-text leading-tight mb-2 sm:mb-3 line-clamp-2 group-hover:text-dashboard-primary transition-colors">
                  {doc.title}
                </h3>
                <p className="text-slate-400 text-[10px] sm:text-xs font-medium line-clamp-2 sm:line-clamp-3 leading-relaxed mb-4 sm:mb-6">
                  {doc.description}
                </p>
              </div>

              <div className="mt-auto p-8 pt-6 flex items-center justify-between border-t border-slate-50 bg-slate-100/30">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-left">
                      Agregado el
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => handleShare(e, doc)} 
                    className="p-3 text-slate-400 hover:text-dashboard-primary hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200"
                    title="Compartir"
                  >
                    <FiShare2 className="text-lg" />
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDocToDelete(doc) }} 
                      className="p-3 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-red-50"
                    >
                      <FiTrash2 className="text-lg" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <>
        {selectedDoc && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-0 animate-fade-in">
            <div className="absolute inset-0 bg-dashboard-bg/80 backdrop-blur-md" onClick={() => setSelectedDoc(null)} />
            <div className="relative w-full max-w-6xl bg-white shadow-2xl overflow-hidden animate-scale-in border border-slate-100 flex flex-col h-screen md:h-[95vh] md:mt-4 md:rounded-[3rem]">
              <div className="p-5 sm:p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-dashboard-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                    <FiFileText className="text-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingDoc ? (
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm sm:text-lg font-bold outline-none focus:ring-2 focus:ring-dashboard-primary/20"
                          placeholder="Título del documento"
                        />
                        <select 
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-dashboard-primary outline-none focus:ring-4 focus:ring-dashboard-primary/10"
                        >
                          <option value="educacion_fisica">Biblioteca Educación Física</option>
                          <option value="extra">Documentación Extra</option>
                          <option value="mto">Mensaje de Tráfico (MTO)</option>
                        </select>
                        <input 
                          type="date" 
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-dashboard-primary/20"
                        />
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-xl font-bold text-dashboard-text tracking-tight leading-tight" title={selectedDoc.title}>
                          {selectedDoc.title}
                        </h3>
                        <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Biblioteca Digital • GNA</p>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-2.5 sm:p-3 bg-white border border-slate-200 text-slate-400 hover:text-dashboard-primary hover:border-dashboard-primary rounded-2xl transition-all shadow-sm active:scale-90 shrink-0 ml-4 group"
                >
                  <FiX className="text-xl group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Lado Izquierdo: Visualizador PDF (Solo Desktop) */}
                <div className="hidden lg:block lg:flex-1 bg-slate-100 relative">
                  <iframe 
                    key={`${selectedDoc.id}-${currentFileIndex}`}
                    src={`${(selectedDoc.file_urls || [selectedDoc.file_url])[currentFileIndex]}#toolbar=0`} 
                    className="w-full h-full border-none"
                    title="Vista Previa PDF"
                  />
                </div>

                {/* Lado Derecho: Detalles y Acciones */}
                <div className="w-full lg:w-96 bg-white border-l border-slate-100 p-8 flex flex-col justify-between overflow-y-auto no-scrollbar">
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-[10px] font-black text-dashboard-primary uppercase tracking-[0.2em] mb-4">Descripción</h4>
                      {editingDoc ? (
                        <textarea 
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium min-h-[100px] outline-none focus:ring-2 focus:ring-dashboard-primary/20"
                        />
                      ) : (
                        <p className="text-slate-500 font-medium leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm">
                          {selectedDoc.description || 'Sin descripción disponible.'}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Fecha</p>
                        <p className="text-xs font-bold text-dashboard-text">{new Date(selectedDoc.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Descargas</p>
                        <p className="text-xs font-bold text-dashboard-text">{selectedDoc.download_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 space-y-4">
                    <button 
                      onClick={() => handleDownload(selectedDoc)}
                      className="w-full py-4 bg-dashboard-primary text-white font-bold rounded-2xl shadow-xl shadow-dashboard-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all flex items-center justify-center gap-3 border border-dashboard-primary/10 text-sm"
                    >
                      <FiDownload className="text-lg" /> Descargar PDF
                    </button>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={(e) => handleShare(e, selectedDoc)}
                        className="flex-1 py-4 bg-white border border-slate-200 text-dashboard-text font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <FaWhatsapp className="text-green-500 text-lg" /> Compartir
                      </button>
                      <button 
                        onClick={() => window.open((selectedDoc.file_urls || [selectedDoc.file_url])[0], '_blank')}
                        className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <FiExternalLink className="text-lg" /> Pantalla Completa
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 mt-6">
                      {isAdmin && (
                        editingDoc ? (
                          <button onClick={handleSaveEdit} disabled={isUploading} className="w-full py-5 bg-dashboard-primary text-white font-bold rounded-[2rem] shadow-xl shadow-dashboard-primary/20 hover:shadow-dashboard-primary/30 active:scale-95 transition-all text-sm tracking-widest uppercase">Guardar Cambios</button>
                        ) : (
                          <button 
                            onClick={() => { 
                              setEditingDoc(selectedDoc.id); 
                              setEditTitle(selectedDoc.title); 
                              setEditDescription(selectedDoc.description); 
                              setEditCategory(selectedDoc.category);
                              setEditDate(selectedDoc.created_at ? new Date(selectedDoc.created_at).toISOString().split('T')[0] : '');
                            }} 
                            className="w-full py-5 bg-white border-2 border-slate-100 text-dashboard-primary hover:bg-dashboard-primary hover:text-white font-bold rounded-[2rem] text-sm transition-all flex items-center justify-center gap-2 tracking-widest uppercase shadow-sm"
                          >
                            <FiEdit2 className="text-lg" /> Editar Información
                          </button>
                        )
                      )}
                    </div>

                    <div className="pt-6 border-t border-slate-100 text-center">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Al alcance de tus manos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {docToDelete && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-6 pt-20 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-center">
            <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <FiTrash2 className="text-red-500 text-3xl" />
              </div>
              <h3 className="text-xl font-black text-dashboard-text mb-3">¿Eliminar Documento?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                Esta acción eliminará de forma permanente <b>{docToDelete.title}</b>.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDocToDelete(null)}
                  className="flex-1 py-4 bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
      <Footer />
    </div>
  )
}
