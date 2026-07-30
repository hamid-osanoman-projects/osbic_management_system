import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';

const supabase = createClient<Database>('https://example.supabase.co', 'key');
const res = supabase.from('documents').insert({
  job_id: '123',
  job_step_id: '123',
  job_sub_task_id: '123',
  uploaded_by: '123',
  file_name: 'test',
  file_path: 'test',
  file_size: 123,
  file_type: 'test',
  document_type: 'test',
  status: 'approved',
  is_client_visible: false,
  version: 1
});
