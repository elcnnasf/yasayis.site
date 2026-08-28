import type { Metadata } from 'next';
import { CityIndex } from '@/components/seo/city-index';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Kirayə evlər',
  description: 'Şəhər seçin — bütöv mənzil və ev elanları.',
};

export default function Page() {
  return <CityIndex title="Kirayə evlər" note="Şəhər seçin — bütöv mənzil və ev elanları." prefix="evler" />;
}
