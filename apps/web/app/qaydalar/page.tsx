import type { Metadata } from 'next';
import { ProseList, ProsePage, ProseSection } from '@/components/layout/prose-page';

export const metadata: Metadata = {
  title: 'İstifadə qaydaları',
  description: 'Yasayis platformasının istifadə şərtləri və elan yerləşdirmə qaydaları.',
};

export default function TermsPage() {
  return (
    <ProsePage
      title="İstifadə qaydaları"
      intro="Platformadan istifadə etməklə aşağıdakı şərtləri qəbul etmiş olursan."
      updatedAt="27 avqust 2026"
    >
      <ProseSection title="1. Platformanın rolu">
        <p>
          Yasayis elan və profil yerləşdirmək üçün texniki vasitədir. Biz kirayə
          müqaviləsinin tərəfi deyilik, vasitəçilik etmirik və heç bir ödənişi
          qəbul etmirik. Ev sahibi ilə tələbə arasındakı razılaşma yalnız onların
          arasındadır.
        </p>
        <p>
          Elanların doğruluğuna zəmanət vermirik. Pul köçürməzdən əvvəl evi
          şəxsən yoxlamaq istifadəçinin öz məsuliyyətidir.
        </p>
      </ProseSection>

      <ProseSection title="2. Hesab">
        <ProseList
          items={[
            'Hesab yaratmaq üçün 16 yaşın tamam olmalıdır.',
            'Verdiyin məlumatlar doğru olmalıdır — başqasının adından hesab açmaq qadağandır.',
            'Parolun təhlükəsizliyi sənin məsuliyyətindədir.',
            'Bir şəxsin bir hesabı olur. Çoxlu hesabla elanı süni şəkildə önə çəkmək qadağandır.',
          ]}
        />
      </ProseSection>

      <ProseSection title="3. Elan yerləşdirmə">
        <p>Elan yerləşdirən şəxs təsdiq edir ki, əmlakı kirayə verməyə hüququ var.</p>
        <ProseList
          items={[
            'Şəkillər həqiqətən həmin əmlaka aid olmalıdır — internetdən götürülmüş şəkil qadağandır.',
            'Qiymət real olmalıdır. Baxışa çağırmaq üçün aşağı qiymət yazıb sonra artırmaq qadağandır.',
            'Eyni əmlak üçün bir neçə elan yerləşdirmək olmaz.',
            'Elanda telefon nömrəsi, sosial şəbəkə linki və ya başqa saytın ünvanı yazılmır — əlaqə platforma üzərindən qurulur.',
            'Elan moderasiyadan keçir. Qaydalara uyğun olmayan elan yerləşdirilmir və səbəbi bildirilir.',
          ]}
        />
      </ProseSection>

      <ProseSection title="4. Qadağan olunan davranış">
        <ProseList
          items={[
            'Ayrı-seçkilik: milliyyət, din, irq və ya sağlamlıq imkanına görə məhdudiyyət qoyan elan mətni.',
            'Saxta elan, mövcud olmayan əmlak, saxta profil.',
            'Beh, depozit və ya &ldquo;yer saxlamaq&rdquo; adı ilə əvvəlcədən pul tələb etmək.',
            'Başqa istifadəçini təhqir etmək, təqib etmək və ya narahat etmək.',
            'Platformadan avtomatik məlumat toplamaq (scraping) və ya onu kommersiya siyahısı kimi istifadə etmək.',
          ]}
        />
        <p>
          Bu qaydaların pozulması elanın silinməsi və hesabın dayandırılması ilə
          nəticələnir.
        </p>
      </ProseSection>

      <ProseSection title="5. Otaq yoldaşı uyğunluğu">
        <p>
          Uyğunluq faizi profil cavabları əsasında hesablanan köməkçi
          göstəricidir. O, tövsiyədir — zəmanət deyil. Kiminlə yaşayacağına qərar
          verməzdən əvvəl həmin şəxslə şəxsən görüşməyi tövsiyə edirik.
        </p>
      </ProseSection>

      <ProseSection title="6. Məsuliyyət">
        <p>
          Platforma &ldquo;olduğu kimi&rdquo; təqdim olunur. İstifadəçilər arasındakı
          razılaşmalardan, ödənişlərdən və ya zərərdən Yasayis məsuliyyət daşımır.
          Xidmətin fasiləsiz işləyəcəyinə zəmanət verilmir.
        </p>
      </ProseSection>

      <ProseSection title="7. Dəyişikliklər">
        <p>
          Qaydalar yenilənə bilər. Əhəmiyyətli dəyişiklik olduqda istifadəçilərə
          bildiriş göndərilir. Dəyişiklikdən sonra platformadan istifadəni davam
          etdirmək yeni qaydaların qəbulu deməkdir.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
