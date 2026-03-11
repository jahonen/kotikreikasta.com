'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminShell.module.scss';
import NotificationInbox from './NotificationInbox';

interface AdminShellProps {
  onSignOut?: () => void | Promise<void>;
  onToast?: (message: string) => void;
  subscriberId?: string | null;
  children?: React.ReactNode;
}

const COLORS = {
  aegean: '#0B3D6B',
  sand: '#F4EFE6',
  sandDark: '#E8E0D2',
  terracotta: '#C4603E',
  gold: '#C9965A',
  white: '#FFFFFF',
  charcoal: '#1C2128',
  muted: '#6B7280',
  surface: '#FDFAF6',
};

const navItems: { href: string; label: string; icon: string }[] = [
  { href: '/admin/listings', label: 'Listings', icon: '🏛️' },
  { href: '/admin/blogs', label: 'Blogs', icon: '✍️' },
  { href: '/admin/team', label: 'Team', icon: '👥' },
  { href: '/admin/partners', label: 'Partners', icon: '🤝' },
  { href: '/admin/marketing', label: 'Marketing', icon: '📊' },
  { href: '/admin/service-requests', label: 'Service Requests', icon: '🛠️' },
];

function PlaceholderTable({ title }: { title: string }) {
  return (
    <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.sandDark}` }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.sandDark}`, background: COLORS.sand }}>
        <h2 style={{ margin: 0, fontSize: 18, color: COLORS.charcoal }}>{title}</h2>
      </div>
      <div style={{ padding: 16, color: COLORS.muted, fontSize: 14 }}>Coming soon.</div>
    </div>
  );
}

export default function AdminShell({ onSignOut, onToast, subscriberId, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const appId = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER as string | undefined;
  const pathname = usePathname();

  return (
    <>
      <div className={styles.adminRoot}>
        {/* Sidebar */}
        <div className={`${styles.sidebar} ${sidebarOpen ? '' : styles.collapsed} ${mobileMenuOpen ? styles.mobileOpen : ''}`} style={{ background: COLORS.aegean }}>
          {/* Logo */}
          <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12, minHeight: 76 }}>
            <div style={{ width: 36, height: 36, background: COLORS.terracotta, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏛️</div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>Kotikreikasta</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, letterSpacing: '0.05em' }}>ADMIN</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 12px', borderRadius: 8, textDecoration: 'none',
                    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontWeight: active ? 600 : 400, fontSize: 14,
                    transition: 'background .15s, color .15s', whiteSpace: 'nowrap', overflow: 'hidden',
                    borderLeft: active ? `3px solid ${COLORS.terracotta}` : '3px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle (desktop) */}
          <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '8px 12px', fontSize: 18, width: '100%' }}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
        )}

        {/* Main */}
        <div className={styles.main}>
          <div className={styles.topbar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button className={styles.mobileToggle} onClick={() => setMobileMenuOpen((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: COLORS.charcoal }}>☰</button>
              <div style={{ fontSize: 13, color: COLORS.muted }}>Admin</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {appId && (
                <NotificationInbox subscriberId={subscriberId ?? '69afc8050b131f8a6a17f52c'} />
              )}
              <button onClick={onSignOut} style={{ background: COLORS.terracotta, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Kirjaudu ulos</button>
            </div>
          </div>

          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </>
  );
}
