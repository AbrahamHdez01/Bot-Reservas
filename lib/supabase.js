import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables de entorno de Supabase: SUPABASE_URL y SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Función helper para manejar errores de Supabase
export function handleSupabaseError(error) {
  console.error('Error de Supabase:', error);
  return {
    error: true,
    message: error.message,
    details: error.details || error.hint || 'Error desconocido'
  };
} 