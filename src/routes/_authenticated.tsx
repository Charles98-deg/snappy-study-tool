import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });

    const metadata = data.user.user_metadata;
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email ?? null,
      display_name:
        typeof metadata.full_name === "string"
          ? metadata.full_name
          : typeof metadata.name === "string"
            ? metadata.name
            : null,
      avatar_url: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    });

    return { user: data.user };
  },
  component: () => <Outlet />,
});