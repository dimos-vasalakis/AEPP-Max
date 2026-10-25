import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Σύνδεση · AEPP Max" };

export default function LoginPage() {
  return (
    // Always the Λευκό theme, whatever theme the editor uses: data-theme scopes the tokens.
    <main
      data-theme="light"
      className="flex min-h-dvh items-center justify-center bg-bg p-4 text-text"
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
