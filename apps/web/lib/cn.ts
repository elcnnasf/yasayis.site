import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind siniflərini birləşdirir və konfliktləri həll edir. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
