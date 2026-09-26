"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WikiSwitcher } from "./WikiSwitcher";

export function WikiSwitcherHost() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const currentVertical = pathname.replace(/^\/+/, "").split("/")[0];

  useEffect(() => {
    const onOpen = () => setOpen((v) => !v);
    document.addEventListener("wiki:open-wiki-switcher", onOpen);
    return () => document.removeEventListener("wiki:open-wiki-switcher", onOpen);
  }, []);

  return (
    <WikiSwitcher open={open} onClose={() => setOpen(false)} currentVertical={currentVertical} />
  );
}
