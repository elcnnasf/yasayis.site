import type { Metadata } from 'next';
import { MapPinOff } from 'lucide-react';
import { EmptyState } from '@/components/empty/empty-state';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Səhifə tapılmadı',
  robots: { index: false, follow: false },
};

/**
 * 404.
 *
 * Kök `/[city]` marşrutu mövcud olmayan şəhər üçün `notFound()` çağırır, ona
 * görə bu səhifə praktikada ən çox səhv yazılmış şəhər adında görünür — mətn
 * də məhz ona görə "ünvan yanlışdır" deyil, "belə səhifə yoxdur" deyir.
 *
 * Naviqasiya və altlıq layout-dan gəlir: istifadəçi tupikdə qalmır.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <EmptyState
        icon={MapPinOff}
        title="Belə səhifə yoxdur."
        description="Ünvan səhv yazılmış ola bilər, ya da bu səhifə silinib. Axtarışdan davam edə bilərsiniz."
        actions={
          <>
            <ButtonLink href="/axtaris">Ev və otaqlara bax</ButtonLink>
            <ButtonLink href="/" variant="tertiary">
              Ana səhifə
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}
