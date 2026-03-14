import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  // Default landing: go to Listings dashboard
  redirect('/admin/listings');
}
