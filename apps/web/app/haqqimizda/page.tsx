import type { Metadata } from 'next';
import { ProseList, ProsePage, ProseSection } from '@/components/layout/prose-page';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Haqqımızda',
  description:
    'Yasayis — Azərbaycan tələbələri üçün ev, otaq və otaq yoldaşı platforması. Niyə qurulduğunu və necə işlədiyini oxu.',
};

export default function AboutPage() {
  return (
    <ProsePage
      title="Haqqımızda"
      intro="Yasayis Azərbaycan tələbələri üçün qurulmuş yaşayış platformasıdır: həm ev və otaq, həm də otaq yoldaşı tapmaq üçün."
    >
      <ProseSection title="Problem">
        <p>
          Semestr başlayanda tələbə iki ayrı işi eyni vaxtda görməli olur: uyğun
          qiymətə, universitetə yaxın yer tapmaq və o yeri kiminləsə bölüşmək.
          Ümumi elan saytları yalnız birinci hissəyə cavab verir — ikincisi isə
          tanışlıq və təsadüf üzərində qalır.
        </p>
        <p>
          Nəticədə tələbə ya büdcəsindən yuxarı tək yaşayır, ya da tanımadığı
          adamla köçüb bir neçə ay sonra yenidən ev axtarır.
        </p>
      </ProseSection>

      <ProseSection title="Yanaşmamız">
        <p>Platforma üç şey üzərində qurulub və hər üçü ilk gündən işləyir:</p>
        <ProseList
          items={[
            <>
              <strong>Universitetə yaxınlıq</strong> — hər elanda ən yaxın
              universitetə neçə dəqiqə olduğu yazılır.
            </>,
            <>
              <strong>Büdcə şəffaflığı</strong> — kommunal xərcin daxil olub-olmadığı
              və depozit qiymətin yanındadır.
            </>,
            <>
              <strong>Otaq yoldaşı uyğunluğu</strong> — faizi göstəririk və onun
              nədən yarandığını da yazırıq. Qara qutu skor yoxdur.
            </>,
          ]}
        />
      </ProseSection>

      <ProseSection title="Nə vəd etmirik">
        <p>
          &ldquo;Minlərlə elan&rdquo; vəd etmirik. Platforma yenidir və elan sayı
          ilk dövrdə az olacaq — bunu gizlətmirik. Elan yoxdursa boş vəziyyət
          göstərilir və axtarış bildirişi təklif olunur; saxta rəqəm və uydurma
          statistika göstərilmir.
        </p>
        <p>
          Vasitəçi deyilik və komissiya götürmürük: əlaqə birbaşa ev sahibi və ya
          tələbə ilə qurulur.
        </p>
      </ProseSection>

      <ProseSection title="Təhlükəsizlik">
        <p>
          Profillər telefon nömrəsi ilə təsdiqlənir və şikayət mexanizmi hər
          elanda mövcuddur. Buna baxmayaraq, pul köçürməzdən əvvəl evi{' '}
          <strong>şəxsən yoxlamağı</strong> tövsiyə edirik. Heç bir onlayn təsdiq
          yerində baxışı əvəz etmir.
        </p>
      </ProseSection>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <ButtonLink href="/axtaris">Elanlara bax</ButtonLink>
        <ButtonLink href="/elaqe" variant="tertiary">
          Bizimlə əlaqə
        </ButtonLink>
      </div>
    </ProsePage>
  );
}
