CREATE TABLE IF NOT EXISTS public.startshield_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  memory_key text NOT NULL,
  memory_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(device_id, memory_key)
);

-- Safely get the device ID from headers, or NULL if not present
CREATE OR REPLACE FUNCTION public.get_request_device_id()
RETURNS text AS $$
DECLARE
  headers jsonb;
BEGIN
  BEGIN
    headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  RETURN headers->>'x-startshield-device-id';
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_startshield_memory_modtime ON public.startshield_memory;
CREATE TRIGGER update_startshield_memory_modtime
    BEFORE UPDATE ON public.startshield_memory
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_modified_column();

-- Enable RLS
ALTER TABLE public.startshield_memory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anon can select own device memory" ON public.startshield_memory;
DROP POLICY IF EXISTS "Anon can insert own device memory" ON public.startshield_memory;
DROP POLICY IF EXISTS "Anon can update own device memory" ON public.startshield_memory;

-- Create policies for anon
CREATE POLICY "Anon can select own device memory" 
  ON public.startshield_memory 
  FOR SELECT 
  TO anon 
  USING (device_id = public.get_request_device_id() AND device_id IS NOT NULL);

CREATE POLICY "Anon can insert own device memory" 
  ON public.startshield_memory 
  FOR INSERT 
  TO anon 
  WITH CHECK (device_id = public.get_request_device_id() AND device_id IS NOT NULL);

CREATE POLICY "Anon can update own device memory" 
  ON public.startshield_memory 
  FOR UPDATE 
  TO anon 
  USING (device_id = public.get_request_device_id() AND device_id IS NOT NULL)
  WITH CHECK (device_id = public.get_request_device_id() AND device_id IS NOT NULL);
