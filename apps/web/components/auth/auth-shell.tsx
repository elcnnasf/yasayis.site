import Link from 'next/link';
import type { ReactNode } from 'react';
import { Panel } from '@/components/ui/card';

/**
 * Giriş və qeydiyyat səhifələrinin ortaq çərçivəsi.
 *
 * İki səhifə bir komponentdən keçir ki, forma eni, başlıq ölçüsü və altdakı
 * keçid sətri eyni olsun — istifadəçi biri-birinə keçəndə səhifə "tərpənməsin".
 *
 * Enin dar saxlanması (`max-w-md`) qərardır: uzun sətir forma sahələrini
 * gözdən qaçırır və göz hər dəfə soldan sağa uzun yol gedir.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Altdakı "hesabın var?" tipli keçid. */
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-h1 text-stone-900">{title}</h1>
      <p className="mt-2 text-body leading-relaxed text-stone-600">{subtitle}</p>

      <Panel className="mt-6 p-5 sm:p-6">{children}</Panel>

      <p className="mt-5 text-center text-body text-stone-600">{footer}</p>
    </div>
  );
}

/** Formanın altındakı keçid — iki səhifədə eyni görünsün deyə ayrıca. */
export function AuthSwitch({ href, prompt, action }: { href: string; prompt: string; action: string }) {
  return (
    <>
      {prompt}{' '}
      <Link href={href} className="font-semibold text-sprout-600 hover:underline">
        {action}
      </Link>
    </>
  );
}
