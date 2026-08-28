import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { getSeoRoutes } from '@/lib/seo-data';
import { Card } from '@/components/ui/card';
import { Well } from '@/components/ui/card';

/**
 * Kateqoriya indeks səhifəsi — /evler, /telebeler.
 *
 * Şəhər siyahısı taksonomiyadan gəlir: admin yeni şəhər əlavə edəndə
 * burada da avtomatik görünür.
 */
export async function CityIndex({
  title,
  note,
  prefix,
}: {
  title: string;
  note: string;
  prefix: string;
}) {
  const routes = await getSeoRoutes();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-h1 text-stone-900">{title}</h1>
      <p className="mt-2 text-lead text-stone-600">{note}</p>

      {routes.length === 0 ? (
        <Well className="mt-6 text-sm text-stone-600">
          Şəhər siyahısı yüklənmədi. Bir azdan yenidən cəhd edin.
        </Well>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {routes.map((route) => (
            <li key={route.citySlug}>
              <Link href={`/${prefix}/${route.citySlug}`}>
                <Card interactive className="flex items-center gap-2.5 p-4">
                  <MapPin className="size-4 shrink-0 text-forest-600" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-body font-semibold text-stone-900">
                      {route.cityName}
                    </p>
                    {route.districts.length > 0 && (
                      <p className="tabular text-2xs text-stone-500">
                        {route.districts.length} rayon
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
