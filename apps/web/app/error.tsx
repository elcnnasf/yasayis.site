'use client';

import { useEffect } from 'react';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';

/**
 * Marşrut səviyyəsində xəta ekranı.
 *
 * Bu fayl olmadan istehsalatda hər gözlənilməz xəta Next.js-in boz
 * "Application error: a client-side exception has occurred" ekranını verir:
 * nə brend, nə naviqasiya, nə də irəli yol.
 *
 * `digest` GÖSTƏRİLİR, `message` isə YOX. İstehsalatda Next mesajı onsuz da
 * gizlədir; `digest` isə server loglarındakı qeydlə eyni açardır — istifadəçi
 * onu deyəndə xətanı tapmaq mümkün olur.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Xəta izləmə xidməti qoşulanda bu çağırış onunla əvəzlənir.
    console.error('[yasayis] marşrut xətası', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <Panel className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-warning-50 text-warning-600"
        >
          <TriangleAlert className="size-6" strokeWidth={1.75} />
        </span>

        <h1 className="mt-5 max-w-md text-h3 text-stone-900">Nəsə səhv getdi.</h1>
        <p className="mt-2 max-w-md text-body leading-relaxed text-stone-600">
          Səhifə yüklənərkən gözlənilməz xəta baş verdi. Yenidən cəhd edin — problem
          davam edərsə bizə yazın.
        </p>

        {error.digest && (
          <p className="tabular mt-4 rounded-[var(--radius-input)] bg-stone-100 px-3 py-1.5 text-2xs text-stone-500">
            Xəta kodu: {error.digest}
          </p>
        )}

        <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button onClick={reset}>
            <RotateCw className="size-4" aria-hidden />
            Yenidən cəhd et
          </Button>
          <ButtonLink href="/" variant="tertiary">
            Ana səhifə
          </ButtonLink>
        </div>
      </Panel>
    </div>
  );
}
