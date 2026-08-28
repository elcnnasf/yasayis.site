import { SEO_PAGE_KINDS } from '@yasayis/shared';
import { makeMetadata, makePage } from '@/lib/seo-category';

/*
  `revalidate` və `dynamicParams` BURADA, hərfi dəyər kimi elan olunur.

  Next.js marşrut seqmenti konfiqurasiyasını statik təhlillə oxuyur: dəyər
  başqa fayldan `export { revalidate } from '...'` şəklində gələndə onu
  tanımır və səssizcə standart konfiqurasiyaya keçir. Uzun müddət belə idi —
  build hər dəfə xəbərdarlıq verirdi, səhifələr isə yenilənmirdi və yeni elan
  bu SEO səhifələrinə yalnız növbəti deploy-dan sonra düşürdü.

  Eyni səbəbdən dəyər HƏRFİ ədəddir, import edilmiş sabit deyil: `revalidate =
  SEO_REVALIDATE_SECONDS` yazılanda Next.js "Unknown identifier" verir və
  `next build` bütövlükdə dayanır (`Invalid segment configuration export`).
  Dəyərin mənbəyi `lib/seo-category.ts`-dəki `SEO_REVALIDATE_SECONDS`-dir —
  ikisi birlikdə dəyişməlidir.

  Yalnız `generateStaticParams` funksiyadır və re-export edilə bilir.
*/
export const revalidate = 600;
export const dynamicParams = true;

export { generateStaticParams } from '@/lib/seo-category';

export const generateMetadata = makeMetadata(SEO_PAGE_KINDS.HOMES);
export default makePage(SEO_PAGE_KINDS.HOMES);
