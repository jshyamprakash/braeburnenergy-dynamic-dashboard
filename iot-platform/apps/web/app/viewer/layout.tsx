/**
 * Viewer Kiosk Layout — hides Sidebar + TopBar for full-screen display
 * (T10 - ADR-045)
 */
export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      {children}
    </div>
  );
}
