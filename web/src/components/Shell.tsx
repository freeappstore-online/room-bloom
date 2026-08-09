import type { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export function Shell({ children, sidebar }: ShellProps) {
  return (
    <>
      <div className="hidden md:flex h-screen">
        <aside
          className="flex flex-col border-r h-full shrink-0"
          style={{ width: "17rem", borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <div className="px-6 py-5 flex items-center gap-2">
            <span className="text-2xl">🌸</span>
            <span className="font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>Room Bloom</span>
          </div>
          {sidebar ? sidebar : <nav className="flex-1 px-4" />}
          <div className="p-4 text-xs" style={{ color: "var(--muted)" }}>
            <a href="https://freeappstore.online" target="_blank" rel="noopener noreferrer"
              className="hover:underline" style={{ color: "var(--muted)" }}>
              Part of FreeAppStore — free forever
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
      <div className="flex flex-col h-screen md:hidden">
        <header className="flex items-center px-4 h-14 border-b shrink-0"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
          <span className="text-xl mr-2">🌸</span>
          <span className="font-bold" style={{ fontFamily: "Fraunces, serif" }}>Room Bloom</span>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </>
  );
}
