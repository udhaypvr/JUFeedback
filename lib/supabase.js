import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndltssrmcodznvpvsxkx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbHRzc3JtY29kem52cHZzeGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNzk0NTMsImV4cCI6MjEwNTY1NTQ1M30.r1Z-UoMGhehxh1qMJ4gmj9C-CFvLYeDzTAX0772fhj0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);