import type { Metadata } from 'next';

/**
 * Dizayn sistemi vitrini — YALNIZ KOMANDA ÜÇÜN.
 *
 * Səhifənin özü `'use client'`-dir və `metadata` ixrac edə bilmir, ona görə
 * indeksləmə qadağası bu layout-dadır. Onsuz axtarış sistemləri komponent
 * vitrinini saytın məzmunu kimi indeksləyir və "Yasayis" axtarışında düymə
 * nümunələri çıxır.
 */
export const metadata: Metadata = {
  title: 'Dizayn sistemi',
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
