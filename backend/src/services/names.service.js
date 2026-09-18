import { supabase } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';

export async function insertName(name) {
  const { data, error } = await supabase
    .from('arjunTest')
    .insert({ name })
    .select()
    .single();

  if (error) throw new ApiError(500, error.message);

  return data;
}

export async function getAllNames() {
  const { data, error } = await supabase
    .from('arjunTest')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(500, error.message);

  return data;
}
