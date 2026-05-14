# Biblioteca Virtual

Plataforma de gestión y consulta de reglamentos, directivas y mensajes de tráfico operacional (MTO). Diseñada con un enfoque moderno, seguro y optimizado para dispositivos móviles.

## 🚀 Características

- **Gestión de Documentos**: Carga, edición y eliminación de archivos PDF organizados por categorías.
- **Categorías Especializadas**: Educación Física y Otros Documentos.
- **MTOs Recibidos**: Sección dedicada para mensajes oficiales con soporte para múltiples archivos adjuntos.
- **Buscador Inteligente**: Filtros rápidos en tiempo real por título, contenido o prefijo.
- **Seguridad**: Sistema de login con roles (Administrador/Lector) y prevención de autocompletado.
- **Notificaciones**: Integración con Telegram para alertas de inicio de sesión.
- **Diseño Responsivo**: Interfaz moderna adaptable con menú de hamburguesa y cuadrículas optimizadas para móvil.

## 🛠️ Tecnologías

- **Frontend**: React.js + Vite
- **Estilos**: Tailwind CSS
- **Backend/Base de Datos**: Supabase (PostgreSQL + Storage)
- **Notificaciones**: Telegram Bot API
- **Iconos**: React Icons (Feather)

## 📦 Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/biblioteca.git
   cd biblioteca
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   - Copia el archivo `.env.example` a `.env`
   - Completa tus credenciales de Supabase y Telegram.
   ```bash
   cp .env.example .env
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 🗄️ Configuración de Base de Datos (Supabase)

Para que el sistema funcione correctamente, debes crear las siguientes tablas y políticas en tu proyecto de Supabase (las instrucciones detalladas están en `src/lib/supabase.js`):

- Tabla `documents`: Almacena la biblioteca general.
- Tabla `mto_recibidos`: Almacena los mensajes operativos.
- Tabla `library_users`: Gestión de usuarios y permisos.
- Storage Bucket `pdfs`: Para el almacenamiento de archivos físicos.

## 📄 Licencia

Este proyecto es de uso privado.
