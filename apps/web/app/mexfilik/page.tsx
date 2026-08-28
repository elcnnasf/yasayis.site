import type { Metadata } from 'next';
import { CONTACT_INFO } from '@yasayis/shared';
import { ProseList, ProsePage, ProseSection } from '@/components/layout/prose-page';

export const metadata: Metadata = {
  title: 'Məxfilik siyasəti',
  description:
    'Yasayis hansı məlumatları toplayır, nə üçün saxlayır və kimlərlə paylaşır.',
};

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Məxfilik siyasəti"
      intro="Hansı məlumatı topladığımızı, nə üçün saxladığımızı və onu necə idarə edə biləcəyini izah edir."
      updatedAt="27 avqust 2026"
    >
      <ProseSection title="1. Nə toplayırıq">
        <ProseList
          items={[
            <>
              <strong>Hesab məlumatı:</strong> ad, e-poçt, telefon nömrəsi, parolun
              şifrələnmiş forması.
            </>,
            <>
              <strong>Profil məlumatı:</strong> universitet, ixtisas, büdcə aralığı,
              yaşayış tərzi cavabları, axtardığın rayonlar.
            </>,
            <>
              <strong>Elan məlumatı:</strong> əmlakın ünvanı, qiyməti, şəkilləri.
            </>,
            <>
              <strong>Texniki məlumat:</strong> IP ünvanı, brauzer növü və sessiya
              çərəzləri.
            </>,
          ]}
        />
      </ProseSection>

      <ProseSection title="2. Nə üçün istifadə edirik">
        <ProseList
          items={[
            'Hesabını yaratmaq və girişi təmin etmək.',
            'Uyğunluq faizini hesablamaq — bu, profil cavabları olmadan mümkün deyil.',
            'Axtarış bildirişləri göndərmək (yalnız özün yaratdıqda).',
            'Saxta elan və sui-istifadəni aşkarlamaq.',
          ]}
        />
        <p>
          Məlumatını reklam məqsədilə üçüncü tərəflərə <strong>satmırıq</strong>.
        </p>
      </ProseSection>

      <ProseSection title="3. Kim nəyi görür">
        <p>
          Profilinin hər sahəsinin görünürlüyünü ayrıca idarə edirsən. Standart
          olaraq <strong>dəqiq büdcə rəqəmi və cins üstünlüyü gizlidir</strong> —
          onları yalnız özün açsan başqaları görür.
        </p>
        <p>
          Telefon nömrən elanda və ya profilində göstərilmir. O, yalnız qarşı tərəf
          əlaqə sorğunu qəbul etdikdən sonra açılır.
        </p>
        <p>
          Əmlakın dəqiq ünvanı yalnız sahibinə və moderatora görünür; siyahıda
          yalnız rayon göstərilir.
        </p>
      </ProseSection>

      <ProseSection title="4. Çərəzlər">
        <p>
          Yalnız işləmək üçün zəruri çərəzlərdən istifadə edirik: sessiyanı
          saxlayan giriş çərəzi və təhlükəsizlik çərəzi. Reklam və izləmə çərəzi
          qoymuruq, ona görə çərəz razılığı pəncərəsi də yoxdur.
        </p>
      </ProseSection>

      <ProseSection title="5. Nə qədər saxlayırıq">
        <ProseList
          items={[
            'Hesab məlumatı — hesab aktiv olduğu müddətdə.',
            'Silinmiş elan — 30 gün (səhvən silinəni bərpa etmək üçün), sonra tam silinir.',
            'Şikayət və moderasiya qeydləri — 12 ay.',
          ]}
        />
      </ProseSection>

      <ProseSection title="6. Hüquqların">
        <ProseList
          items={[
            'Məlumatına baxmaq və onu düzəltmək — profil bölməsindən.',
            'Hesabını silmək — bununla profil, elanlar və uyğunluq tarixçəsi silinir.',
            'Bildirişlərdən imtina etmək.',
          ]}
        />
        <p>
          Hesabın silinməsi və ya məlumatının surəti üçün{' '}
          <a
            href={`mailto:${CONTACT_INFO.email}`}
            className="font-semibold text-sprout-600 hover:underline"
          >
            {CONTACT_INFO.email}
          </a>{' '}
          ünvanına yaz.
        </p>
      </ProseSection>

      <ProseSection title="7. Təhlükəsizlik">
        <p>
          Parollar geri qaytarıla bilməyən şəkildə şifrələnir (argon2) və heç bir
          işçimiz onları görmür. Bağlantı HTTPS üzərindən qurulur. Buna baxmayaraq,
          heç bir sistem tam təhlükəsiz deyil — parolunu başqa saytlarda təkrar
          işlətmə.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
