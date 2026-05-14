import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { FiUploadCloud, FiX, FiFileText, FiCalendar, FiHash, FiType, FiBook, FiShield, FiMail } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Footer from './Footer'

export default function UploadPDF({ onUploadComplete }) {
  const { user } = useAuth()
  const [uploadType, setUploadType] = useState('reglamento')
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('educacion_fisica')

  const [mtoDate, setMtoDate] = useState('')
  const [mtoPrefix, setMtoPrefix] = useState('')
  const [mtoNumber, setMtoNumber] = useState('')
  const [mtextContent, setMtextContent] = useState('')

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
    if (newFiles.length > 0) setFiles(prev => [...prev, ...newFiles])
    else if (e.target.files.length > 0) toast.error('Solo archivos PDF')
  }

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (uploadType === 'reglamento' && files.length === 0) return toast.error('Sube al menos un PDF')
    
    setUploading(true)
    const toastId = toast.loading('Subiendo archivos...')
    try {
      const uploadedUrls = []
      const uploadedNames = []

      for (const file of files) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2,9)}.pdf`
        await supabase.storage.from('pdfs').upload(fileName, file)
        const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(fileName)
        uploadedUrls.push(publicUrl)
        uploadedNames.push(file.name)
      }

      if (uploadType === 'reglamento') {
        await supabase.from('documents').insert([{ 
          title: title.trim(), 
          description: description.trim(), 
          category,
          file_urls: uploadedUrls, 
          file_names: uploadedNames,
          uploader_name: user?.username || 'Admin'
        }])
        toast.success('Reglamento guardado', { id: toastId })
      } else {
        await supabase.from('mto_recibidos').insert([{ 
          date_mto: mtoDate,
          prefix: mtoPrefix.toUpperCase(),
          number: mtoNumber,
          content: mtextContent.trim(),
          file_urls: uploadedUrls, 
          file_names: uploadedNames,
          uploader_name: user?.username || 'Admin'
        }])
        toast.success('MTO registrado', { id: toastId })
      }

      setTitle(''); setDescription(''); setMtoPrefix(''); setMtoNumber(''); setMtextContent(''); setFiles([])
      if (onUploadComplete) onUploadComplete()
    } catch (err) {
      toast.error('Error: ' + err.message, { id: toastId })
    }
    setUploading(false)
  }

  return (
    <div className="animate-fade-up max-w-4xl mx-auto pb-10">
      <div className="mb-10 flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-dashboard-text tracking-tight">¡Bienvenido al Panel de Carga!</h2>
          <p className="text-dashboard-text-muted mt-1 font-medium">Selecciona el destino y completa los datos para subir tu archivo.</p>
        </div>
        
        <div className="flex bg-dashboard-surface p-1.5 rounded-[1.5rem] lg:rounded-[2rem] border border-soft-green shadow-sm w-full lg:w-fit overflow-x-auto no-scrollbar">
          <button 
            type="button"
            onClick={() => { setUploadType('reglamento'); setCategory('educacion_fisica') }} 
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 lg:px-8 py-3 rounded-xl lg:rounded-[1.5rem] text-[9px] lg:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${uploadType === 'reglamento' && category === 'educacion_fisica' ? 'bg-dashboard-primary text-white shadow-xl shadow-dashboard-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <FiBook className="text-sm lg:text-base" />
            <span className="hidden xs:inline">Biblioteca EF</span>
            <span className="xs:hidden">Biblio</span>
          </button>
          <button 
            type="button"
            onClick={() => { setUploadType('reglamento'); setCategory('extra') }} 
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 lg:px-8 py-3 rounded-xl lg:rounded-[1.5rem] text-[9px] lg:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${uploadType === 'reglamento' && category === 'extra' ? 'bg-dashboard-primary text-white shadow-xl shadow-dashboard-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <FiFileText className="text-sm lg:text-base" />
            <span className="hidden xs:inline">Extras</span>
            <span className="xs:hidden">Extras</span>
          </button>
          <button 
            type="button"
            onClick={() => setUploadType('mto')} 
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 lg:px-8 py-3 rounded-xl lg:rounded-[1.5rem] text-[9px] lg:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${uploadType === 'mto' ? 'bg-dashboard-primary text-white shadow-xl shadow-dashboard-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <FiMail className="text-sm lg:text-base" />
            <span className="hidden xs:inline">Mensaje MTO</span>
            <span className="xs:hidden">MTO</span>
          </button>
        </div>
      </div>

      <div className="bg-dashboard-surface rounded-[2rem] lg:rounded-[2.5rem] border border-soft-green shadow-soft p-6 lg:p-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {uploadType === 'reglamento' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Título del documento ({category === 'educacion_fisica' ? 'Biblioteca EF' : 'Extras'})
                </label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Ej: Reglamento de Evaluación Técnica" 
                  className="w-full px-6 py-4 bg-[var(--input-bg)] text-[var(--input-text)] border border-dashboard-border rounded-2xl outline-none focus:border-dashboard-primary transition-all font-medium text-sm" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descripción / Resumen</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Escribe un breve resumen de lo que trata este documento..." 
                  rows={4} 
                  className="w-full px-6 py-4 bg-[var(--input-bg)] text-[var(--input-text)] border border-dashboard-border rounded-2xl outline-none focus:border-dashboard-primary transition-all font-medium text-sm resize-none" 
                  required 
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2"><FiCalendar /> Fecha</label>
                  <input type="date" value={mtoDate} onChange={e => setMtoDate(e.target.value)} className="w-full px-6 py-4 bg-[var(--input-bg)] text-[var(--input-text)] border border-dashboard-border rounded-2xl outline-none focus:border-dashboard-primary text-sm font-medium" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2"><FiType /> Prefijo</label>
                  <input type="text" value={mtoPrefix} onChange={e => setMtoPrefix(e.target.value)} placeholder="Ej: GFC" className="w-full px-6 py-4 bg-[var(--input-bg)] text-[var(--input-text)] border border-dashboard-border rounded-2xl outline-none focus:border-dashboard-primary text-sm font-medium uppercase" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2"><FiHash /> Número</label>
                  <input type="text" value={mtoNumber} onChange={e => setMtoNumber(e.target.value)} placeholder="Ej: 123/24" className="w-full px-6 py-4 bg-[var(--input-bg)] text-[var(--input-text)] border border-dashboard-border rounded-2xl outline-none focus:border-dashboard-primary text-sm font-medium" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contenido del Mensaje</label>
                <textarea 
                  value={mtextContent} 
                  onChange={e => setMtextContent(e.target.value)} 
                  placeholder="Detalle completo de la comunicación..." 
                  rows={4} 
                  className="w-full px-6 py-4 bg-[var(--input-bg)] text-[var(--input-text)] border border-dashboard-border rounded-2xl outline-none focus:border-dashboard-primary transition-all font-medium text-sm resize-none font-mono" 
                  required 
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Archivos PDF</label>
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="group border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center cursor-pointer hover:border-dashboard-primary/40 hover:bg-slate-50 transition-all"
            >
              <input ref={fileInputRef} type="file" accept=".pdf" multiple onChange={handleFileChange} className="hidden" />
              <FiUploadCloud className="text-4xl text-slate-300 mx-auto mb-4 group-hover:text-dashboard-primary transition-colors" />
              <p className="text-slate-500 font-bold text-base">Click para seleccionar archivos</p>
              <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold">Solo formato PDF compatible</p>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-dashboard-bg rounded-2xl border border-soft-green">
                    <div className="flex items-center gap-3 min-w-0">
                      <FiFileText className="text-dashboard-primary" />
                      <span className="text-xs font-bold text-slate-600 truncate">{f.name}</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500 transition-colors"><FiX /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={uploading} 
            className="w-full py-5 bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-700/20 hover:bg-indigo-800 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 text-base uppercase tracking-widest relative z-10"
          >
            {uploading ? 'Subiendo...' : 'Confirmar Carga'}
          </button>
        </form>
        <Footer />
      </div>
    </div>
  )
}
