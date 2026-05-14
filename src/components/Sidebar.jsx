import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiBookOpen, FiHome, FiUpload, FiUsers, FiLogOut, FiBarChart2, FiClock, FiMenu, FiX, FiShield, FiMapPin } from 'react-icons/fi'

const SidebarContent = ({ isMobile = false, user, isAdmin, activeView, setActiveView, setIsOpen, logout, menuItems }) => (
  <div className="flex flex-col min-h-full bg-white lg:bg-transparent border-r border-slate-200 lg:border-none">
    {/* Brand Section */}
    <div className="p-8 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <FiBookOpen className="text-dashboard-primary text-2xl" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-dashboard-text leading-tight">Biblioteca</span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest text-dashboard-primary">Virtual</span>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-4 space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = activeView === item.id
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveView(item.id)
              if (isMobile) setIsOpen(false)
            }}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-semibold transition-all group relative ${
              isActive 
                ? 'bg-dashboard-primary/10 text-dashboard-primary' 
                : 'text-slate-500 hover:text-dashboard-primary hover:bg-slate-50'
            }`}
          >
            {isActive && <div className="absolute left-0 w-1.5 h-8 bg-dashboard-primary rounded-r-full" />}
            <Icon className={`text-xl ${isActive ? 'text-dashboard-primary' : 'text-slate-400 group-hover:text-dashboard-primary'}`} />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        )
      })}
    </nav>


    {/* User Section - Más prominente y accesible */}
    <div className="px-6 py-8 mt-auto border-t border-slate-100 bg-slate-50/30">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Logout clicked');
          logout();
        }}
        className="w-full flex items-center justify-center gap-3 py-4 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer z-[100]"
      >
        <FiLogOut className="text-lg" />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  </div>
)

export default function Sidebar({ activeView, setActiveView, onLogout, isOpen, setIsOpen }) {
  const { user, isAdmin, logout: contextLogout } = useAuth()
  const logout = onLogout || contextLogout

  const menuItems = [
    { id: 'home', label: 'Inicio', icon: FiHome },
    { id: 'library', label: 'Biblioteca EF', icon: FiBookOpen },
    { id: 'all', label: 'Documentación Extra', icon: FiShield },
    { id: 'mto', label: 'MTOs Recibidos', icon: FiClock },
    { id: 'gna', label: 'Unidades de GNA', icon: FiMapPin },
    ...(isAdmin ? [
      { id: 'upload', label: 'Subir Archivo', icon: FiUpload },
      { id: 'users', label: 'Usuarios', icon: FiUsers },
      { id: 'stats', label: 'Tablero de Control', icon: FiBarChart2 },
    ] : []),
  ]

  const commonProps = {
    user, isAdmin, activeView, setActiveView, setIsOpen, logout, menuItems
  }

  return (
    <>
      {/* Mobile Header Overlay */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 px-6 flex items-center justify-between bg-white/90 backdrop-blur-xl border-b border-dashboard-border z-[100]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-dashboard-primary rounded-xl flex items-center justify-center">
            <FiBookOpen className="text-white text-lg" />
          </div>
          <span className="font-bold tracking-tight">Biblioteca Virtual</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 bg-dashboard-bg rounded-xl text-slate-400"
        >
          <FiMenu className="text-xl" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden" onClick={() => setIsOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-dashboard-surface z-[60] shadow-2xl animate-in slide-in-from-left duration-300 lg:hidden flex flex-col">
            <div className="absolute top-6 right-6 z-[70]">
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="p-3 bg-dashboard-bg rounded-2xl text-slate-400 hover:text-dashboard-primary active:scale-90 transition-all shadow-sm"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <SidebarContent isMobile={true} {...commonProps} />
            </div>
          </aside>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 p-4">
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-soft border border-slate-200/50 overflow-hidden">
          <SidebarContent {...commonProps} />
        </div>
      </aside>
    </>
  )
}
