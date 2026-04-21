import { CreatorsDirectory } from '@/modules/components/creators/CreatorsDirectory';
import Footer from '@/modules/components/landing/Footer';
import { Header } from '@/modules/components/landing/Header';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type SessionPayload = {
  id?: string;
  role?: string;
};

export default async function CreatorsPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('asw_session')?.value;
  if (!sessionCookie) {
    redirect('/');
  }

  let session: SessionPayload | null = null;
  try {
    session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as SessionPayload;
  } catch {
    redirect('/');
  }

  const userId = session?.id?.trim();
  const role = session?.role;
  if (!userId) {
    redirect('/');
  }
  if (role !== 'admin' && role !== 'marketing') {
    redirect('/');
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('is_mkt, is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('creators access check failed:', error);
    redirect('/');
  }

  const canAccess =
    role === 'admin'
      ? Boolean(data?.is_admin)
      : Boolean(data?.is_mkt);
  if (!canAccess) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-primary/10">
      <main className="flex-1">
        <Header />
          <CreatorsDirectory />
        <Footer />
      </main>
    </div>
  );
}

