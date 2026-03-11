'use client';

import { Suspense } from 'react';

let NovuNotificationCenter: any = null;
try {
  // Lazy require to avoid breaking tests/build if env not set
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NovuNotificationCenter = require('@novu/notification-center').NovuProvider
    ? require('@novu/notification-center')
    : null;
} catch {}

export default function AdminNotifications({ subscriberId }: { subscriberId: string | null }) {
  const appId = process.env.NEXT_PUBLIC_NOVU_APP_ID as string | undefined;
  const canRender = Boolean(appId && subscriberId && NovuNotificationCenter);

  if (!canRender) {
    return (
      <button
        style={{
          background: 'none',
          border: '1px solid var(--sand-dark)',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 13,
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
        title="Ilmoitukset"
      >
        🔔 Ilmoitukset
      </button>
    );
  }

  const { NovuProvider, NotificationBell, PopoverWrapper } = NovuNotificationCenter as any;

  return (
    <Suspense fallback={<span>…</span>}>
      <NovuProvider applicationIdentifier={appId} subscriberId={subscriberId}>
        <PopoverWrapper>
          <NotificationBell unseenBadgeColor="#C4603E" colorScheme="light" />
        </PopoverWrapper>
      </NovuProvider>
    </Suspense>
  );
}
