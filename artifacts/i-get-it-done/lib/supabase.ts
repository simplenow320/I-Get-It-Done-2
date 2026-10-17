import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || {};
const supabaseUrl = extra.supabaseUrl || process.env.SUPABASE_URL || "";
const supabaseAnonKey = extra.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbTask {
  id: string;
  user_id: string | null;
  title: string;
  notes: string | null;
  lane: string;
  reminder_type: string;
  is_overdue: boolean;
  created_at: string;
  completed_at: string | null;
  due_date: string | null;
}

export interface DbSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
}

export interface DbContact {
  id: string;
  user_id: string | null;
  name: string;
  role: string | null;
  color: string;
}

export interface DbUser {
  id: string;
  email: string;
  created_at: string;
}
