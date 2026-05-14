CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Table: library_users
CREATE TABLE IF NOT EXISTS library_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Table: documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    file_urls TEXT[] DEFAULT '{}',
    file_names TEXT[] DEFAULT '{}',
    uploader_name TEXT,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Table: mto_recibidos
CREATE TABLE IF NOT EXISTS mto_recibidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prefix TEXT,
    number TEXT,
    content TEXT,
    date_mto TEXT,
    file_urls TEXT[] DEFAULT '{}',
    file_names TEXT[] DEFAULT '{}',
    uploader_name TEXT,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE library_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mto_recibidos ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (Permisivas para funcionalidad inmediata)
CREATE POLICY "Public Read Users" ON library_users FOR SELECT USING (true);
CREATE POLICY "Public Write Users" ON library_users FOR ALL USING (true);
CREATE POLICY "Public Read Docs" ON documents FOR SELECT USING (true);
CREATE POLICY "Public Write Docs" ON documents FOR ALL USING (true);
CREATE POLICY "Public Read MTO" ON mto_recibidos FOR SELECT USING (true);
CREATE POLICY "Public Write MTO" ON mto_recibidos FOR ALL USING (true);

-- Función para incrementar descargas vía RPC
CREATE OR REPLACE FUNCTION increment_download(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE documents
  SET download_count = download_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Insertar usuario administrador inicial (si no existe)
-- Usuario: Ger25$ | Clave: Emi25$
INSERT INTO library_users (username, password, is_admin)
VALUES ('Ger25$', 'Emi25$', true)
ON CONFLICT (username) DO NOTHING;
