-- Ejecutar este SQL en el editor de Supabase para habilitar la tabla de actividad

-- 1. Crear Tabla: activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_name TEXT NOT NULL,
    file_name TEXT,
    activity_type TEXT NOT NULL, -- 'login' o 'download'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Política de acceso (Permisiva para administración)
CREATE POLICY "Public All Activity Logs" ON activity_logs FOR ALL USING (true);
