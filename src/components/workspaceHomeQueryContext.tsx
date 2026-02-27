"use client";

import { createContext, useContext } from "react";

type WorkspaceHomeQueryContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const WorkspaceHomeQueryContext = createContext<WorkspaceHomeQueryContextValue | null>(null);

export function WorkspaceHomeQueryProvider({
  value,
  children,
}: {
  value: WorkspaceHomeQueryContextValue;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceHomeQueryContext.Provider value={value}>
      {children}
    </WorkspaceHomeQueryContext.Provider>
  );
}

export function useWorkspaceHomeQuery() {
  return useContext(WorkspaceHomeQueryContext);
}
