import type { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export function Shell({ children, sidebar }: ShellProps) {
  return (
    <>
      {/* Desktop layout */}
      <div className="hidden md:flex h-screen">
        <aside
          className="flex flex-col border-r h-full shrink-0"
          style={{ width: "17rem", borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <div className="px-6 py-5 flex items-center gap-2 border-b" style={{ borderColor: "var(--line)" }}>
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-bold text-base leading-tight" style={{ fontFamily: "Fraunces, serif" }}>Home Quest</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>Gamified chore reminders</div>
            </div>
          </div>
          {sidebar ?? <nav className="flex-1 px-4" />}
          <div className="p-4 text-xs border-t" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
            <a
              href="https://freeappstore.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--muted)" }}
            >
              Part of FreeAppStore — free forever
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col h-screen md:hidden">
        <header
          className="flex items-center px-4 h-14 border-b shrink-0"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <span className="text-xl mr-2">🏆</span>
          <span className="font-bold" style={{ fontFamily: "Fraunces, serif" }}>Home Quest</span>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </>
  );
}
