'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ListingWizard from '../../../../components/admin/ListingWizard';

export default function NewListingPage() {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  return (
    <div>
      <ListingWizard
        open={open}
        onClose={() => { setOpen(false); router.push('/admin/listings'); }}
        onSaved={() => { setOpen(false); router.push('/admin/listings'); }}
      />
    </div>
  );
}
