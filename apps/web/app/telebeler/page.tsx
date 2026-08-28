import type { Metadata } from 'next';
import { CityIndex } from '@/components/seo/city-index';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Tələbələr üçün yaşayış',
  description: 'Şəhər seçin — tələbələrə uyğun elanlar.',
};

export default function Page() {
  return <CityIndex title="Tələbələr üçün yaşayış" note="Şəhər seçin — tələbələrə uyğun elanlar." prefix="telebeler" />;
}
