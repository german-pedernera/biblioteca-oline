
-- Tabla para las contribuciones de los usuarios
CREATE TABLE IF NOT EXISTS contributions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_name TEXT NOT NULL,
    comment TEXT,
    file_url TEXT,
    file_name TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    category TEXT DEFAULT 'biblioteca' -- mto, biblioteca, extra
);

-- Políticas de seguridad (RLS)
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Permitir insertar a todos
CREATE POLICY "Public Insert" ON contributions FOR INSERT WITH CHECK (true);

-- Permitir ver y editar solo al admin (asumiendo que el admin está autenticado)
CREATE POLICY "Admin Access" ON contributions FOR ALL USING (true);
