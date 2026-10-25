"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "./client";
import { supabaseConfigured } from "./config";

/** The signed-in user (null when signed out), or undefined while loading. */
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(
    supabaseConfigured ? undefined : null,
  );

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  return user;
}
