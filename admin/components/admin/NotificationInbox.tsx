'use client';

import { Inbox } from '@novu/nextjs';

export default function NotificationInbox({ subscriberId }: { subscriberId: string }) {
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER as string | undefined;
  if (!applicationIdentifier) return null;

  const backendUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL as string | undefined;
  const socketUrl = process.env.NEXT_PUBLIC_NOVU_SOCKET_URL as string | undefined;

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriberId={subscriberId}
      {...(backendUrl ? { backendUrl } : {})}
      {...(socketUrl ? { socketUrl } : {})}
      appearance={{
        variables: {
          colorPrimary: 'var(--gold)',
          colorPrimaryForeground: 'var(--aegean-deep)',
          colorBackground: 'var(--white)',
          colorForeground: 'var(--text)',
          colorNeutral: 'var(--sand-dark)'
        },
        elements: {
          bellIcon: { color: 'var(--text)' }
        }
      }}
    />
  );
}
