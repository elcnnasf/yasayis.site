import { FinalCTA } from './final-cta';
import { Hero } from './hero';
import { HowItWorks } from './how-it-works';
import { PopularLocations } from './popular-locations';
import { PropertySection } from './property-section';
import { RoommateSection } from './roommate-section';
import { WhyYasayis } from './why-yasayis';
import { HomeSearch } from '@/components/search/home-search';

/**
 * Qeydiyyatsız ziyarətçi üçün ana səhifə.
 *
 * BÖLMƏ SIRASI QƏRARDIR, təsadüf deyil. İstifadəçi ilk 5 saniyədə "bu sayt
 * tələbələr üçün ev və otaq yoldaşı tapmaq üçündür" mesajını almalıdır, sonra
 * mümkün qədər tez iki axından birinə keçməlidir:
 *
 *   Ana səhifə → Ev / otaq tap → filtr → siyahı → elan → əlaqə
 *   Ana səhifə → Otaq yoldaşı tap → uyğunluq → profil → əlaqə
 *
 *   1. Hero          — mesaj + iki axının qapısı + məhsulun özünün önizləməsi
 *   2. HomeSearch    — axtarış zolağı hero-nun üstünə oturur: "başla" deməkdən
 *                      əvvəl başlamağın yolunu verir
 *   3. PopularLocations — qərar verə bilməyənə hazır giriş nöqtəsi
 *   4. PropertySection  — birinci axının nə verdiyini GÖSTƏRİR
 *   5. RoommateSection  — ikinci axın; platformanın əsas fərqi, ona görə
 *                      səhifədəki ən vurğulu bölmə
 *   6. WhyYasayis    — indi izah: baxdıqdan sonra "niyə burada?" sualı gəlir
 *   7. HowItWorks    — qorxunu azaldır: cəmi üç addımdır
 *   8. FinalCTA      — aşağıya çatana eyni iki qapını təkrar açır
 *
 * Mesajlaşma qaydası: "burada çoxlu ev var" DEYİL. Kəmiyyət vədini ilk gün
 * yerinə yetirə bilmərik və rəqiblər onsuz da verir. Fokus uyğunluqdadır —
 * o, ilk gündən doğrudur.
 *
 * Bu komponent özü serverdə render olunur: bütün data yükləməsi alt
 * bölmələrin öz içindədir, ona görə burada `'use client'` lazım deyil.
 */
export function GuestHome() {
  return (
    <>
      <Hero />

      {/*
        Axtarış zolağı hero-nun tünd sahəsinin üstünə oturur — iki bölməni
        bir-birinə tikir və səhifənin ən vacib aləti ilk ekranı tərk etmir.

        En hero ilə eynidir (`max-w-7xl`), dar deyil: dar qutuda altı sahə
        sığmır və desktopda alt-alta düşür. Sahələr yalnız `lg`-dən aşağıda,
        yəni yer doğrudan çatmayanda yığılır.
      */}
      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:-mt-14 sm:px-6">
        <HomeSearch />
      </section>

      <PopularLocations />
      <PropertySection />
      <RoommateSection />
      <WhyYasayis />
      <HowItWorks />
      <FinalCTA />
    </>
  );
}
