import { redirect } from 'next/navigation';

export default function AdminMaterialsRedirectPage() {
  redirect('/admin/projects');
}
