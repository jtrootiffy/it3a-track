"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

const STORAGE_KEY = "it3a-theme";

function currentTheme(): Theme {
  const selected = document.documentElement.getAttribute("data-theme");
  if (selected === "light" || selected === "dark") return selected;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(currentTheme());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!document.documentElement.getAttribute("data-theme")) {
        setTheme(currentTheme());
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  function toggle() {
    const next: Theme = (theme ?? currentTheme()) === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies to this page when storage is unavailable.
    }
  }

  const label =
    theme === null
      ? "Switch light and dark theme"
      : theme === "dark"
        ? "Switch to light theme"
        : "Switch to dark theme";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn("w-9 border border-line px-0", className)}
    >
      {theme === "dark" ? (
        <Sun size={15} weight="bold" aria-hidden="true" />
      ) : (
        <Moon size={15} weight="bold" aria-hidden="true" />
      )}
    </Button>
  );
}
