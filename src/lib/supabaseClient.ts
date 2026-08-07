import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://deexxxcovloydgxbmbbd.supabase.co';
const supabaseAnonKey = 'sb_publishable_v_jT8B6XVPTCpYnvxPPDuQ_a6q5fJB8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
