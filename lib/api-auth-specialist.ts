import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Specialist } from "@/lib/specialists/types";

interface SpecialistAuth {
  userId: string;
  specialistId: string;
  specialist: Specialist;
}

export async function verifySpecialist(
  req: NextRequest
): Promise<SpecialistAuth | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: specialist } = await supabase
    .from("specialists")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!specialist) return null;

  return {
    userId: user.id,
    specialistId: specialist.id,
    specialist: specialist as Specialist,
  };
}
