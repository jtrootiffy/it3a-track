"use client";

import { SignOut } from "@phosphor-icons/react";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="secondary" size="sm" aria-label="Sign out">
        <SignOut size={15} weight="bold" aria-hidden="true" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
