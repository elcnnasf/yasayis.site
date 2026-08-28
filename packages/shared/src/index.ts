/**
 * @yasayis/shared — frontend və backend arasındakı yeganə ortaq təbəqə.
 *
 * Burada I/O yoxdur, Prisma yoxdur, framework asılılığı yoxdur:
 * yalnız domen tipləri, Zod sxemləri, icazə qaydaları və saf funksiyalar.
 */

export * from './enums';
export * from './labels';
export * from './constants';
export * from './permissions';
export * from './onboarding';
export * from './lifecycle';
export * from './format';
export * from './contact';
export * from './marketing';
export * from './seo';

export * from './matching/weights';
export * from './matching/score';

export * from './schemas/common';
export * from './schemas/auth';
export * from './schemas/profile';
export * from './schemas/listing';
export * from './schemas/search';
export * from './schemas/interaction';
export * from './schemas/favorites';
export * from './schemas/admin';
export * from './schemas/analytics';
export * from './schemas/taxonomy';
export * from './schemas/roommate';
export * from './schemas/message';
