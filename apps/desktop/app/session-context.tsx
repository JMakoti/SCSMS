"use client";

import { createContext, useContext } from "react";

export const DesktopRoleContext = createContext<string | null>(null);

export function useDesktopRole() {
  return useContext(DesktopRoleContext);
}
