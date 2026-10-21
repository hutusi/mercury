"use client";

import { createContext, useContext } from "react";

const DraftOwnerContext = createContext<string | null>(null);

/**
 * The signed-in account local drafts belong to, set once by the (app) layout
 * so draft keys are scoped without threading a user id through every runner.
 */
export function DraftOwnerProvider({
  owner,
  children,
}: {
  owner: string;
  children: React.ReactNode;
}) {
  return <DraftOwnerContext.Provider value={owner}>{children}</DraftOwnerContext.Provider>;
}

/** Null outside the (app) layout: drafts are then neither restored nor saved. */
export function useDraftOwner(): string | null {
  return useContext(DraftOwnerContext);
}
