export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-full" style={{ background: 'var(--ui-bg)' }}>{children}</div>;
}
