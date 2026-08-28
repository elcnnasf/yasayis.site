'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * Elanın yerləşməsi — REAL xəritə (Leaflet + OpenStreetMap).
 *
 * NİYƏ LEAFLET
 * Açar tələb etmir və pulsuzdur. Google Maps həm açar, həm ödəniş hesabı
 * istəyir; layihədə isə ödənişli xarici xidmət yoxdur. Kafellər adi şəkil kimi
 * gəlir, ona görə `connect-src` toxunulmur — CSP-də yalnız `img-src`-ə
 * `*.tile.openstreetmap.org` əlavə olunub.
 *
 * MƏXFİLİK
 * Dəqiq nöqtə yalnız elan sahibinindir və bu, SERVERDƏ təmin olunur:
 * `toDetailDto` sahib olmayana sürüşdürülmüş və yuvarlaqlaşdırılmış koordinat
 * qaytarır (bax: `blurredCoords`). Burada heç nə gizlədilmir — komponent
 * aldığı nöqtəni olduğu kimi çəkir.
 *
 * Fərq yalnız TƏSVİRDƏDİR:
 *   · sahibi  → işarə (marker), dəqiq nöqtə;
 *   · hər kəs → dairə, çünki aldığı nöqtə onsuz da təxminidir.
 *
 * Leaflet YALNIZ brauzerdə işləyir (`window`-a toxunur), ona görə dinamik
 * import `useEffect` içindədir — server render zamanı ümumiyyətlə yüklənmir.
 */

/**
 * Dairənin radiusu (metr).
 * Serverdəki sürüşdürmədən (220 m) böyükdür ki, real nöqtə dairənin içində
 * qalsın — kənarında yox.
 */
const PRIVACY_RADIUS_M = 500;

export function ListingMap({
  latitude,
  longitude,
  exact,
  label,
}: {
  latitude: number;
  longitude: number;
  /** true = sahibidir; server dəqiq nöqtə göndərib, işarə ilə göstərilir. */
  exact: boolean;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      const [lat, lng] = [latitude, longitude];

      map = L.map(node, {
        center: [lat, lng],
        zoom: exact ? 16 : 14,
        // Səhifə sürüşdürəndə xəritə "tutmasın" — mobil-də bu, ən çox
        // əsəbləşdirən davranışdır. Yaxınlaşdırma düymələri qalır.
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      if (exact) {
        /*
          Öz ikon şəklimiz yoxdur və Leaflet-in standart ikonu `node_modules`
          içindəki PNG-lərə keçid verir — Next-in build-ində o yollar qırılır.
          `divIcon` yalnız HTML/CSS-dir: əlavə fayl da, CSP icazəsi də lazım
          deyil.
        */
        L.marker([lat, lng], {
          title: label,
          icon: L.divIcon({
            className: '',
            html:
              '<span style="display:block;width:18px;height:18px;border-radius:9999px;' +
              'background:var(--color-sprout-600,#268a5d);box-shadow:0 0 0 4px rgba(38,138,93,.28)"></span>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(map);
      } else {
        L.circle([lat, lng], {
          radius: PRIVACY_RADIUS_M,
          color: 'var(--color-sprout-600, #268a5d)',
          weight: 2,
          fillColor: 'var(--color-sprout-600, #268a5d)',
          fillOpacity: 0.14,
        }).addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude, exact, label]);

  return (
    <>
      {/*
        `relative z-0 isolate` — xəritənin başlığın ÜSTÜNƏ çıxmasının qarşısını alır.

        Leaflet daxildə böyük z-index dəyərləri işlədir (təbəqələr 400,
        idarəetmə düymələri 800–1000). Sayt başlığı isə `z-40`-dır, yəni
        sürüşdürəndə xəritə onun üstündə qalırdı. `isolation: isolate` yeni
        yığılma konteksti yaradır: Leaflet-in bütün z-index dəyərləri həmin
        kontekstin İÇİNDƏ hesablanır və kənara çıxa bilmir. `z-0` isə konteksti
        başlıqdan (`z-40`) aşağı saxlayır.
      */}
      <div
        ref={containerRef}
        role="img"
        aria-label={
          exact ? `${label} — dəqiq yerləşmə` : `${label} — təxmini yerləşmə sahəsi`
        }
        className="relative z-0 h-52 w-full isolate sm:h-64"
      />
    </>
  );
}

export { ListingMap as default };
