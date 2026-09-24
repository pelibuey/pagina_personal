-- ==============================================================================
-- CRIS PLATFORM - SUPABASE SCHEMA COMPLETO (Sincronización en Tiempo Real & Bot)
-- ==============================================================================
-- Instrucciones:
-- 1. Ve a tu proyecto en Supabase (https://app.supabase.com)
-- 2. Entra en "SQL Editor" en el menú lateral izquierdo
-- 3. Pega este contenido y pulsa "Run" (ejecutar)
-- ==============================================================================

-- 1. Tabla de Estado y Módulos de la Plataforma CRIS (Sincronización JSONB)
CREATE TABLE IF NOT EXISTS public.cris_app_state (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.cris_app_state ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para permitir acceso con la Anon Key pública de Supabase
DROP POLICY IF EXISTS "Permitir lectura publica de cris_app_state" ON public.cris_app_state;
CREATE POLICY "Permitir lectura publica de cris_app_state" 
ON public.cris_app_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura publica de cris_app_state" ON public.cris_app_state;
CREATE POLICY "Permitir escritura publica de cris_app_state" 
ON public.cris_app_state FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Supabase Realtime para que la web se actualice en directo sin recargar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'cris_app_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cris_app_state;
  END IF;
END $$;

-- 2. Tabla para historial de conversaciones del Bot de Telegram & Gemini Flash
CREATE TABLE IF NOT EXISTS public.cris_bot_messages (
    id BIGSERIAL PRIMARY KEY,
    sender TEXT NOT NULL, -- 'user' | 'assistant'
    chat_id TEXT,
    message TEXT NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cris_bot_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en cris_bot_messages" ON public.cris_bot_messages;
CREATE POLICY "Permitir todo en cris_bot_messages" 
ON public.cris_bot_messages FOR ALL USING (true);

-- Datos iniciales de arranque para evitar consultas vacías
INSERT INTO public.cris_app_state (key, data)
VALUES 
  ('auth_pin', '{"pinHash": "2f9789e1db8f96ffbcb5465a97e4bd309ae37cc9c1e45d0d114e7a2add854a21", "pinLength": 4}'),
  ('cris_quick_notes', '"Bienvenida a tu plataforma CRIS. Todo tu ecosistema sincronizado."')
ON CONFLICT (key) DO NOTHING;
