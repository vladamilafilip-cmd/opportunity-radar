import { supabase } from "@/integrations/supabase/client";

export async function checkSupabase(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from("symbols")
      .select("id")
      .limit(1);
    
    if (error) {
      return { connected: false, error: error.message };
    }
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message };
  }
}
