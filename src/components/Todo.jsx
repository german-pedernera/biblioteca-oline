import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FiFileText, FiClock, FiSearch, FiCalendar, FiDownload, FiEye, FiTrash2, FiEdit2, FiX, FiCheck, FiExternalLink, FiMaximize2, FiShare2 } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Footer from './Footer'

export default function Todo() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  
  // Edición
  const [editingItem, setEditingItem] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDate, setEditDate] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (selectedItem || itemToDelete) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [selectedItem, itemToDelete])

  const fetchAll = async () => {
    setLoading(true)
    try {
      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
      
      if (docsError) throw docsError

      // Fetch MTOs
      const { data: mtos, error: mtosError } = await supabase
        .from('mto_recibidos')
        .select('*')
      
      if (mtosError) throw mtosError

      // Normalize and combine
      const normalizedDocs = (docs || []).map(d => ({
        ...d,
        type: 'document',
        displayTitle: d.title,
        displayCategory: d.category.replace('_', ' '),
        date: new Date(d.created_at)
      }))

      const normalizedMtos = (mtos || []).map(m => ({
        ...m,
        type: 'mto',
        displayTitle: `MTO ${m.prefix} ${m.number}`,
        displayCategory: 'Mensaje Oficial',
        date: new Date(m.created_at)
      }))

      // Merge and sort by date (Oldest to Newest as requested)
      const combined = [...normalizedDocs, ...normalizedMtos].sort((a, b) => a.date - b.date)
      
      setItems(combined)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la base de datos completa')
    }
    setLoading(false)
  }

  const filteredItems = items.filter(item => {
    const query = (searchQuery || "").toLowerCase().trim()
    if (!query) return true
    
    const title = (item.displayTitle || "").toLowerCase()
    const content = (item.content || "").toLowerCase()
    const description = (item.description || "").toLowerCase()
    const category = (item.displayCategory || "").toLowerCase()

    return title.includes(query) || 
           content.includes(query) || 
           description.includes(query) ||
           category.includes(query)
  })


  const handleView = (item) => {
    setSelectedItem(item)
    setCurrentFileIndex(0)
    setEditingItem(null)
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const table = itemToDelete.type === 'mto' ? 'mto_recibidos' : 'documents'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw error
      setItems(items.filter(i => !(i.id === itemToDelete.id && i.type === itemToDelete.type)))
      toast.success('Registro eliminado')
      setItemToDelete(null)
    } catch (err) {
      toast.error('Error al eliminar')
    }
    setIsDeleting(false)
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return
    const toastId = toast.loading('Guardando...')
    try {
      const isCurrentlyMto = selectedItem.type === 'mto'
      const isMovingToMto = editCategory === 'mto'
      
      if (isCurrentlyMto && !isMovingToMto) {
        // Move from mto_recibidos to documents
        const { error: insErr } = await supabase.from('documents').insert({
          title: editTitle,
          description: editContent,
          category: editCategory,
          file_urls: selectedItem.file_urls || [selectedItem.file_url],
          file_names: selectedItem.file_names || [selectedItem.file_name],
          uploader_name: selectedItem.uploader_name,
          download_count: selectedItem.download_count || 0
        })
        if (insErr) throw insErr
        await supabase.from('mto_recibidos').delete().eq('id', selectedItem.id)
        toast.success('Movido a Documentos', { id: toastId })
        fetchAll() // Reload to reflect changes
      } else if (!isCurrentlyMto && isMovingToMto) {
        // Move from documents to mto_recibidos
        const { error: insErr } = await supabase.from('mto_recibidos').insert({
          prefix: 'MTO',
          number: 'S/N',
          content: editTitle + '\n\n' + editContent,
          file_urls: selectedItem.file_urls || [selectedItem.file_url],
          file_names: selectedItem.file_names || [selectedItem.file_name],
          uploader_name: selectedItem.uploader_name,
          date_mto: new Date().toISOString().split('T')[0]
        })
        if (insErr) throw insErr
        await supabase.from('documents').delete().eq('id', selectedItem.id)
        toast.success('Movido a MTO', { id: toastId })
        fetchAll() // Reload to reflect changes
      } else {
        // Normal update within the same table
        const table = isCurrentlyMto ? 'mto_recibidos' : 'documents'
        const updateData = isCurrentlyMto 
          ? { content: editContent, date_mto: editDate || selectedItem.date_mto }
          : { title: editTitle, description: editContent, category: editCategory, created_at: editDate || selectedItem.created_at }

        const { error } = await supabase
          .from(table)
          .update(updateData)
          .eq('id', selectedItem.id)

        if (error) throw error
        
        setItems(items.map(i => {
          if (i.id === selectedItem.id && i.type === selectedItem.type) {
            return { 
              ...i, 
              displayTitle: isCurrentlyMto ? i.displayTitle : editTitle,
              displayCategory: editCategory.replace('_', ' '),
              content: isCurrentlyMto ? editContent : i.content,
              description: isCurrentlyMto ? i.description : editContent,
              category: isCurrentlyMto ? i.category : editCategory
            }
          }
          return i
        }))
        toast.success('Actualizado correctamente', { id: toastId })
      }
      setEditingItem(null)
      setSelectedItem(null)
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar', { id: toastId })
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-dashboard-text tracking-tight">Biblioteca Completa</h2>
          <p className="text-slate-400 mt-1 font-medium">Cronología completa de documentos y mensajes (Orden: Más Antiguos Primero).</p>
        </div>
        
        <div className="relative group w-full md:w-80">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-dashboard-primary transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en todo el sistema..."
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-dashboard-primary/5 focus:border-dashboard-primary transition-all font-medium text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-40 bg-white rounded-3xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item, idx) => (
            <div 
              key={`${item.type}-${item.id}`}
              className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-dashboard-primary/20 hover:shadow-xl transition-all shadow-card group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.type === 'mto' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                  {item.type === 'mto' ? <FiClock className="text-xl" /> : <FiFileText className="text-xl" />}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block"># {idx + 1}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-1">
                    <FiCalendar /> {item.date.toLocaleDateString()}
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-bold text-dashboard-text mb-2 line-clamp-2 leading-snug group-hover:text-dashboard-primary transition-colors">
                {item.displayTitle}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                {item.displayCategory}
              </p>

              <div className="flex items-center gap-2 mt-auto">
                <button 
                  className="flex-1 py-2 bg-slate-50 text-slate-500 hover:bg-dashboard-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  onClick={() => handleView(item)}
                >
                  <FiEye /> {item.file_urls?.length || item.file_url ? 'Previsualizar' : 'Ver Contenido'}
                </button>
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }}
                    className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detallado con Previsualización */}
      {selectedItem && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-0 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
          <div className="relative w-full max-w-6xl bg-white shadow-2xl overflow-hidden flex flex-col h-screen md:h-fit md:max-h-[95vh] md:mt-4 md:rounded-[3rem] border border-slate-200 animate-scale-in">
            <div className="p-8 sm:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedItem.type === 'mto' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                  {selectedItem.type === 'mto' ? <FiClock className="text-2xl" /> : <FiFileText className="text-2xl" />}
                </div>
                <div className="min-w-0 flex-1">
                  {editingItem ? (
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-dashboard-primary/10 w-full"
                        placeholder="Título"
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
                      <h3 className="text-base sm:text-xl font-bold text-dashboard-text tracking-tight leading-tight" title={selectedItem.displayTitle}>
                        {selectedItem.displayTitle}
                      </h3>
                      <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Biblioteca Completa • GNA</p>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-dashboard-primary hover:border-dashboard-primary rounded-2xl transition-all shadow-sm active:scale-90 shrink-0 ml-4 group"
              >
                <FiX className="text-xl group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-[500px]">
              {/* Lado Izquierdo: PDF o Contenido (Solo Desktop para PDF) */}
              <div className="hidden lg:block lg:flex-1 bg-slate-100 relative overflow-hidden">
                {(selectedItem.file_urls?.length > 0 || selectedItem.file_url) ? (
                  <iframe 
                    key={`${selectedItem.id}-${currentFileIndex}`}
                    src={`${(selectedItem.file_urls || [selectedItem.file_url])[currentFileIndex]}#toolbar=0`} 
                    className="w-full h-full border-none"
                    title="Vista Previa"
                  />
                ) : (
                  <div className="absolute inset-0 p-10 lg:p-16 bg-white overflow-y-auto no-scrollbar">
                    <div className="max-w-2xl mx-auto">
                      {editingItem ? (
                        <textarea 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-96 bg-slate-50 border border-slate-200 rounded-2xl p-6 font-mono text-sm outline-none focus:ring-2 focus:ring-dashboard-primary/20"
                        />
                      ) : (
                        <div className="bg-slate-50/50 p-6 sm:p-10 rounded-[2rem] border border-slate-100 shadow-inner">
                          <div className="font-mono text-[11px] sm:text-sm text-slate-600 leading-[1.8] tracking-wide whitespace-pre-wrap selection:bg-indigo-100">
                            {selectedItem.content || selectedItem.description || "Sin contenido disponible."}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Lado Derecho: Detalles y Selector */}
              <div className="w-full lg:w-80 bg-white border-l border-slate-100 p-8 flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div className="space-y-8">
                  <section>
                    <h4 className="text-[10px] font-black text-dashboard-primary uppercase tracking-[0.2em] mb-4">Detalles</h4>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Tipo:</span>
                        <span className="text-[10px] font-black text-slate-700 uppercase">{selectedItem.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Fecha:</span>
                        <span className="text-[10px] font-black text-slate-700 uppercase">{selectedItem.date.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </section>

                  {(selectedItem.file_urls?.length > 1) && (
                    <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Archivos ({selectedItem.file_urls.length})</h4>
                      <div className="space-y-2">
                        {selectedItem.file_urls.map((url, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setCurrentFileIndex(idx)}
                            className={`w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all text-left min-w-0 ${currentFileIndex === idx ? 'bg-dashboard-primary/10 border-dashboard-primary text-dashboard-primary' : 'bg-white border-slate-100 hover:border-dashboard-primary'}`}
                          >
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${currentFileIndex === idx ? 'bg-dashboard-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                              <FiFileText />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold truncate flex-1">{(selectedItem.file_names || [])[idx] || `Archivo ${idx + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  
                  {selectedItem.file_urls?.length <= 1 && (selectedItem.content || selectedItem.description) && (
                    <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Contenido / Resumen</h4>
                      {editingItem ? (
                        <textarea 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-medium outline-none focus:ring-2 focus:ring-dashboard-primary/20"
                        />
                      ) : (
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-6">{selectedItem.content || selectedItem.description}</p>
                      )}
                    </section>
                  )}
                </div>

                <div className="mt-8 space-y-4">
                  <button 
                    onClick={() => {
                      const url = (selectedItem.file_urls || [selectedItem.file_url])[currentFileIndex];
                      if (url) window.open(url, '_blank');
                    }}
                    className="w-full py-4 bg-dashboard-primary text-white font-bold rounded-2xl shadow-lg shadow-dashboard-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <FiDownload /> Descargar Actual
                  </button>
                  
                  {isAdmin && (
                    <div className="flex flex-col gap-3 mt-6">
                      {editingItem ? (
                        <button onClick={handleSaveEdit} className="w-full py-5 bg-dashboard-primary text-white font-bold rounded-[2rem] shadow-xl shadow-dashboard-primary/20 hover:shadow-dashboard-primary/30 active:scale-95 transition-all text-sm tracking-widest uppercase">Guardar Cambios</button>
                      ) : (
                        <button 
                          onClick={() => { 
                            setEditingItem(selectedItem.id); 
                            setEditTitle(selectedItem.displayTitle); 
                            setEditContent(selectedItem.content || selectedItem.description || ''); 
                            setEditCategory(selectedItem.type === 'mto' ? 'mto' : selectedItem.category);
                            setEditDate(new Date(selectedItem.created_at || selectedItem.date_mto).toISOString().split('T')[0]);
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

      {itemToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-6 pt-20 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-center">
          <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <FiTrash2 className="text-red-500 text-3xl" />
            </div>
            <h3 className="text-xl font-black text-dashboard-text mb-3">¿Eliminar Registro?</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
              Esta acción eliminará de forma permanente este registro de la base de datos.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setItemToDelete(null)}
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
      <Footer />
    </div>
  )
}
