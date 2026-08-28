import type { ReactNode } from 'react';

/**
 * Mətn səhifələrinin ortaq tərtibatı — qaydalar, məxfilik, haqqımızda.
 *
 * Sətir uzunluğu `max-w-2xl` ilə məhdudlaşdırılır: uzun sətirdə göz növbəti
 * sətrin başını itirir və hüquqi mətn onsuz da çətin oxunur.
 *
 * Bölmə başlıqları burada verilir, komponentin içində deyil, çünki hər səhifə
 * eyni ritmi saxlamalıdır — biri `h2`, digəri qalın mətn işlətsə səhifələr
 * ayrı-ayrı adamların yazdığı kimi görünür.
 */
export function ProsePage({
  title,
  intro,
  updatedAt,
  children,
}: {
  title: string;
  intro?: string;
  /** "Son yenilənmə" — hüquqi mətnlərdə vacibdir. */
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-h1 text-stone-900">{title}</h1>

      {intro && <p className="mt-4 text-lead leading-relaxed text-stone-600">{intro}</p>}

      {updatedAt && (
        <p className="mt-3 text-sm text-stone-500">Son yenilənmə: {updatedAt}</p>
      )}

      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </div>
  );
}

/** Mətn səhifəsinin bir bölməsi. */
export function ProseSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-h2 text-stone-900">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-body leading-relaxed text-stone-700">
        {children}
      </div>
    </section>
  );
}

/** Nöqtəli siyahı — bölmələrin içində. */
export function ProseList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-stone-400">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
