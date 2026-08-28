'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * Elan formasında yerin xəritədən seçilməsi.
 *
 * NİYƏ LAZIMDIR
 * `Property` cədvəlində `latitude`/`longitude` sahələri əvvəldən vardı, amma
 * onları dolduran heç bir ekran yox idi — nəticədə bütün elanlar koordinatsız
 * yaranırdı və detal səhifəsindəki xəritə heç vaxt göstərilə bilmirdi.
 *
 * Ünvan mətnindən koordinat HESABLANMIR: geokodlaşdırma xarici xidmət tələb
 * edir və Azərbaycan ünvanlarında nəticəsi etibarsızdır. Ev sahibi öz evini
 * xəritədə bir kliklə göstərir — bu, həm dəqiq, həm də yoxlanıla biləndir.
 *
 * Seçim İSTƏYƏ BAĞLIDIR: koordinat verilməyəndə elan yenə yaranır, detal
 * səhifəsində isə xəritə əvəzinə rayon göstəricisi qalır.
 */

/** Bakının mərkəzi — seçim yoxdursa xəritə buradan açılır. */
const DEFAULT_CENTER: [number, number] = [40.4093, 49.8671];

export function MapPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (next: { lat: number; lng: number } | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  /*
    `onChange` referansı hər render-də dəyişir. Onu effektin asılılığına
    salsaq, xəritə hər render-də sökülüb yenidən qurulur və istifadəçinin
    yaxınlaşdırması itir. Ona görə ən son funksiya ref-də saxlanılır.
  */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const markerRef = useRef<import('leaflet').Marker | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      const start = value ? ([value.lat, value.lng] as [number, number]) : DEFAULT_CENTER;

      map = L.map(node, {
        center: start,
        zoom: value ? 16 : 12,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // `divIcon`: Leaflet-in standart ikonu `node_modules`-dakı PNG-lərə
      // keçid verir və Next build-ində o yollar qırılır.
      const icon = L.divIcon({
        className: '',
        html:
          '<span style="display:block;width:18px;height:18px;border-radius:9999px;' +
          'background:var(--color-sprout-600,#268a5d);box-shadow:0 0 0 4px rgba(38,138,93,.28)"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      if (value) {
        markerRef.current = L.marker([value.lat, value.lng], { icon }).addTo(map);
      }

      map.on('click', (event: import('leaflet').LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else if (map) {
          markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        }
        // Altı onluq rəqəm ~10 sm dəqiqlikdir — bundan artığı mənasızdır.
        onChangeRef.current({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
        });
      });
    })();

    return () => {
      cancelled = true;
      markerRef.current = null;
      map?.remove();
    };
    // Yalnız bir dəfə qurulur: `value` dəyişəndə xəritəni yenidən yaratmaq
    // istifadəçinin baxış sahəsini sıfırlayardı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-stone-800">Xəritədə yer</p>
        {value && (
          <button
            type="button"
            onClick={() => {
              markerRef.current?.remove();
              markerRef.current = null;
              onChange(null);
            }}
            className="text-2xs font-medium text-stone-500 hover:text-danger-600"
          >
            Seçimi sil
          </button>
        )}
      </div>

      <p className="text-sm text-stone-500">
        Evin yerini xəritədə göstərin — istəyə bağlıdır. Tələbələrə{' '}
        <strong>dəqiq nöqtə göstərilmir</strong>, yalnız təxmini sahə görünür.
      </p>

      {/* `relative z-0 isolate` — səbəb `listing-map.tsx`-də izah olunub:
          Leaflet-in daxili z-index-ləri sayt başlığının üstünə çıxmasın. */}
      <div
        ref={containerRef}
        className="relative z-0 h-52 w-full isolate overflow-hidden rounded-[var(--radius-input)] ring-1 ring-stone-200 sm:h-60"
      />

      <p className="tabular text-2xs text-stone-500">
        {value
          ? `Seçildi: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : 'Yer seçmək üçün xəritəyə toxunun.'}
      </p>
    </div>
  );
}

export { MapPicker as default };
