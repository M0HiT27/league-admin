"use client";
import React from "react";

import { Sidebar } from "./Sidebar";

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">{children}</main>
    </div>
  );
};
