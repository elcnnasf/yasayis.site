/**
 * Göstəriş köməkçiləri — Azərbaycan dili və AZN formatlaması.
 * Pul bazada qəpiklə saxlanılır, burada manata çevrilir.
 */

import { QEPIK_PER_MANAT } from './constants';

const AZ_LOCALE = 'az-AZ';

/**
 * Valyuta "AZN" kimi yazılır, "₼" simvolu ilə yox.
 *
 * Simvol bir çox Windows şriftində düzgün render olunmur (boş dördbucaq) və
 * kiçik ölçüdə rəqəmlərlə qarışır. Üç hərf isə hər yerdə eyni oxunur və elan
 * saytlarında istifadəçinin gözlədiyi formadır.
 */
const CURRENCY = 'AZN';

/** 45000 (qəpik) → "450 AZN" */
export function formatPrice(qepik: number | null | undefined): string {
  if (qepik == null) return '—';
  const manat = qepik / QEPIK_PER_MANAT;
  const rounded = Number.isInteger(manat) ? manat : Math.round(manat * 100) / 100;
  return `${new Intl.NumberFormat(AZ_LOCALE, {
    maximumFractionDigits: 2,
  }).format(rounded)} ${CURRENCY}`;
}

/** 45000 → "450 AZN / ay" */
export function formatMonthlyPrice(qepik: number | null | undefined): string {
  return qepik == null ? '—' : `${formatPrice(qepik)} / ay`;
}

/** 30000, 50000 → "300 – 500 AZN" */
export function formatBudgetRange(min: number, max: number): string {
  if (min === max) return formatPrice(min);
  const fmt = new Intl.NumberFormat(AZ_LOCALE, { maximumFractionDigits: 0 });
  return `${fmt.format(min / QEPIK_PER_MANAT)} – ${fmt.format(
    max / QEPIK_PER_MANAT,
  )} ${CURRENCY}`;
}

export function toQepik(manat: number): number {
  return Math.round(manat * QEPIK_PER_MANAT);
}

export function toManat(qepik: number): number {
  return qepik / QEPIK_PER_MANAT;
}

/** "+994501234567" → "+994 50 123 45 67" */
export function formatPhone(phone: string): string {
  const m = /^\+994(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+994 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

const DAY = 86_400_000;

/** Elan tarixi: "bu gün", "dünən", "3 gün əvvəl", sonra tam tarix. */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  if (days <= 0) return 'bu gün';
  if (days === 1) return 'dünən';
  if (days < 7) return `${days} gün əvvəl`;
  if (days < 30) return `${Math.floor(days / 7)} həftə əvvəl`;
  return new Intl.DateTimeFormat(AZ_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(AZ_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** "Yasamal, 2 otaqlı" → "yasamal-2-otaqli" — Azərbaycan hərfləri translit olunur. */
const TRANSLIT: Record<string, string> = {
  ə: 'e', Ə: 'e',
  ı: 'i', I: 'i', İ: 'i', i: 'i',
  ö: 'o', Ö: 'o',
  ü: 'u', Ü: 'u',
  ğ: 'g', Ğ: 'g',
  ş: 's', Ş: 's',
  ç: 'c', Ç: 'c',
};

export function slugify(input: string): string {
  return input
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** "2 otaq" / "5 otaq" — Azərbaycan dilində say formaları dəyişmir. */
export function pluralize(count: number, word: string): string {
  return `${count} ${word}`;
}
