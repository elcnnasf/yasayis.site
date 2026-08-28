'use client';

import { useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { Badge, VerificationRow, VerifiedBadge } from '@/components/ui/badge';
import { Button, ButtonLink, IconButton } from '@/components/ui/button';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ListingCardSkeleton,
  Panel,
  Well,
} from '@/components/ui/card';
import {
  Checkbox,
  ChipGroup,
  ChoiceGroup,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui/field';
import { MatchBar, MatchRing, MatchSummary, ProgressBar } from '@/components/ui/progress';
import { Stepper, StepperActions } from '@/components/ui/stepper';
import {
  EmptyState,
  NoListingsFound,
  NoOwnListings,
  NoRoommatesFound,
  NoSavedItems,
} from '@/components/empty/empty-state';

/**
 * Dizayn sisteminin canlı sənədi.
 *
 * Bu səhifə istehsal marşrutu deyil — komponentləri bir ekranda görüb
 * müqayisə etmək üçündür. Yeni komponent əlavə olunanda buraya da düşməlidir,
 * əks halda kitabxananın nədən ibarət olduğu unudulur.
 */

const lifestyleOptions = [
  { value: 'SAKIT', label: 'Sakit', description: 'Evdə sakitlik və nizam sevirəm' },
  { value: 'SOSIAL', label: 'Sosial', description: 'Qonaq, birgə vaxt keçirmək xoşuma gəlir' },
  { value: 'FERQI_YOXDUR', label: 'Fərqi yoxdur', description: 'Hər ikisinə uyğunlaşıram' },
] as const;

const amenityOptions = [
  { value: 'WIFI', label: 'Wi-Fi' },
  { value: 'KOMBI', label: 'Kombi' },
  { value: 'KONDISIONER', label: 'Kondisioner' },
  { value: 'PALTARYUYAN', label: 'Paltaryuyan' },
  { value: 'MEBEL', label: 'Mebel' },
  { value: 'LIFT', label: 'Lift' },
  { value: 'PARKINQ', label: 'Parkinq' },
  { value: 'BALKON', label: 'Balkon' },
] as const;

const steps = [
  { id: 'role', label: 'Rol' },
  { id: 'university', label: 'Universitet' },
  { id: 'lifestyle', label: 'Həyat tərzi' },
  { id: 'budget', label: 'Büdcə' },
];

export default function DesignSystemPage() {
  const [lifestyle, setLifestyle] = useState<string>('SAKIT');
  const [amenities, setAmenities] = useState<string[]>(['WIFI', 'MEBEL']);
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');

  const toggleAmenity = (value: string) =>
    setAmenities((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-12">
        <p className="text-label uppercase text-sprout-600">Yaşayış</p>
        <h1 className="mt-2 text-display text-stone-900">Dizayn sistemi</h1>
        <p className="mt-3 max-w-2xl text-lead text-stone-600">
          Palitra tək tonludur — yalnız brendin yaşılı. İkinci vurğu rəngi
          qəsdən yoxdur: dərinlik yaşılın çalarlarından, təbəqələnmiş
          səthlərdən və tipoqrafiyadan gəlir. Neytral ton xalis boz deyil,
          içində zəif yaşıl var.
        </p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { t: 'Başlıq şrifti', d: 'Fraunces — serif, ev və etibar hissi' },
            { t: 'İnterfeys şrifti', d: 'Plus Jakarta Sans — oxunaqlı sans' },
            { t: 'Sərhədlər', d: 'ring-1, künc radiusunu pozmur' },
          ].map((x) => (
            <div
              key={x.t}
              className="rounded-[var(--radius-input)] bg-white p-3.5 ring-1 ring-stone-200/70"
            >
              <dt className="text-label uppercase text-stone-500">{x.t}</dt>
              <dd className="mt-1 text-sm text-stone-800">{x.d}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="flex flex-col gap-14">
        {/* --- Rənglər --- */}
        <Section
          title="Rəng tokenləri"
          note="Komponentlərdə xam hex yazılmır — yalnız bu tokenlər."
        >
          <div className="flex flex-col gap-5">
            <Swatches
              name="forest — əsas"
              shades={['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']}
              prefix="bg-forest"
              darkFrom={4}
            />
            <Swatches
              name="sprout — vurğu"
              shades={['50', '100', '200', '300', '400', '500', '600', '700']}
              prefix="bg-sprout"
              darkFrom={5}
            />
            <Swatches
              name="stone — fon və mətn"
              shades={['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']}
              prefix="bg-stone"
              darkFrom={5}
            />
          </div>
        </Section>

        {/* --- Tipoqrafiya --- */}
        <Section
          title="Tipoqrafiya şkalası"
          note="Başlıqlar clamp() ilə kiçik ekranda avtomatik azalır."
        >
          <Panel className="divide-y divide-stone-200/70">
            {[
              { cls: 'text-display', name: 'display', sample: 'Daha uyğun yaşayış' },
              { cls: 'text-h1', name: 'h1', sample: 'Bakıda kirayə otaqlar' },
              { cls: 'text-h2', name: 'h2', sample: 'Uyğun otaq yoldaşları' },
              { cls: 'text-h3', name: 'h3', sample: 'Yasamal, 2 otaqlı' },
              { cls: 'text-lead', name: 'lead', sample: 'Giriş mətni — bir az böyük.' },
              { cls: 'text-body', name: 'body', sample: 'Əsas mətn ölçüsü budur.' },
              { cls: 'text-sm', name: 'sm', sample: 'İkinci dərəcəli məlumat.' },
              { cls: 'text-2xs', name: '2xs', sample: 'Nişan və sayğaclar.' },
            ].map((row) => (
              <div key={row.name} className="flex items-baseline gap-4 px-5 py-4">
                <code className="w-20 shrink-0 text-2xs text-stone-500">{row.name}</code>
                <span className={`${row.cls} min-w-0 truncate text-stone-900`}>
                  {row.sample}
                </span>
              </div>
            ))}
          </Panel>
        </Section>

        {/* --- Düymələr --- */}
        <Section title="Düymələr" note="Səhifədə yalnız bir primary düymə olur.">
          <Panel className="flex flex-col gap-5 p-5">
            <Row label="Variantlar">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="danger">
                <Trash2 className="size-4" aria-hidden />
                Sil
              </Button>
            </Row>
            <Row label="Ölçülər">
              <Button size="sm">Kiçik</Button>
              <Button size="md">Orta</Button>
              <Button size="lg">Böyük</Button>
            </Row>
            <Row label="Hallar">
              <Button loading>Yüklənir</Button>
              <Button disabled>Deaktiv</Button>
              <ButtonLink href="/dizayn-sistemi" variant="secondary">
                Link düyməsi
              </ButtonLink>
              <IconButton label="Bildirişlər">
                <Bell className="size-5" aria-hidden />
              </IconButton>
            </Row>
            <Row label="Mobil">
              <Button fullWidth className="sm:w-auto">
                <Plus className="size-4" aria-hidden />
                Tam enli (mobil-də)
              </Button>
            </Row>
          </Panel>
        </Section>

        {/* --- Nişanlar --- */}
        <Section title="Nişanlar" note="Etibar nişanları brendin yaşılındadır — məna daşıyır.">
          <Panel className="flex flex-col gap-5 p-5">
            <Row label="Etibar">
              <VerifiedBadge kind="student" />
              <VerifiedBadge kind="phone" />
              <VerifiedBadge kind="owner" />
              <VerifiedBadge kind="student" status="pending" />
            </Row>
            <Row label="Ümumi">
              <Badge tone="brand">Tələbələr üçün</Badge>
              <Badge tone="accent">3 boş otaq</Badge>
              <Badge tone="neutral">Yoxlanılır</Badge>
              <Badge tone="warning">Müddəti bitir</Badge>
              <Badge tone="danger">Rədd edilib</Badge>
              <Badge tone="outline">Kommunal daxil</Badge>
            </Row>
            <div>
              <p className="mb-2.5 text-sm font-semibold text-stone-800">
                Öz profilində: nə çatışmır
              </p>
              <Well className="flex flex-col gap-2">
                <VerificationRow kind="phone" verified />
                <VerificationRow kind="student" verified={false} />
                <VerificationRow kind="owner" verified={false} />
              </Well>
            </div>
          </Panel>
        </Section>

        {/* --- Uyğunluq --- */}
        <Section
          title="Uyğunluq göstəriciləri"
          note="Skor heç vaxt izahsız göstərilmir — komponent bunu strukturla məcbur edir."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="flex items-center justify-around gap-4 p-6">
              <MatchRing score={84} size="lg" />
              <MatchRing score={58} size="md" />
              <MatchRing score={31} size="sm" />
            </Panel>

            <Panel className="flex flex-col gap-3 p-6">
              <MatchBar label="Həyat tərzi" score={100} />
              <MatchBar label="Siqaret" score={100} />
              <MatchBar label="Ev heyvanı" score={60} />
              <MatchBar label="Büdcə" score={42} />
            </Panel>

            <Panel className="p-6 lg:col-span-2">
              <MatchSummary
                score={84}
                matches={['Hər ikiniz siqaret çəkmirsiniz', 'Həyat tərziniz uyğun gəlir']}
                difference="Büdcə aralığınız az kəsişir"
              />
            </Panel>

            <Panel className="p-6 lg:col-span-2">
              <ProgressBar value={3} max={5} label="Profil doluluğu" />
            </Panel>
          </div>
        </Section>

        {/* --- Formalar --- */}
        <Section title="Form elementləri" note="Hündürlük 44px — mobil toxunma hədəfi.">
          <Panel className="flex flex-col gap-6 p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ad və soyad" required hint="Elanda göstəriləcək">
                {(p) => <Input placeholder="Aysel Məmmədova" {...p} />}
              </Field>

              <Field label="Telefon" required error="Nömrə +994XXXXXXXXX formatında olmalıdır">
                {(p) => <Input defaultValue="0501234567" {...p} />}
              </Field>

              <Field label="Aylıq qiymət" required hint="Kommunal xərclər ayrıca">
                {(p) => <Input type="number" prefix="AZN" placeholder="450" {...p} />}
              </Field>

              <Field label="Şəhər" required>
                {(p) => (
                  <Select defaultValue="baki" {...p}>
                    <option value="baki">Bakı</option>
                    <option value="gence">Gəncə</option>
                    <option value="sumqayit">Sumqayıt</option>
                  </Select>
                )}
              </Field>
            </div>

            <Field
              label="Özün haqqında"
              hint="Otaq yoldaşı axtaranlar bunu görəcək"
              aside={`${bio.length}/500`}
            >
              {(p) => (
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  placeholder="BDU-da 3-cü kurs tələbəsiyəm, sakit mühit sevirəm..."
                  {...p}
                />
              )}
            </Field>

            <ChoiceGroup
              name="lifestyle"
              legend="Həyat tərzin necədir?"
              options={lifestyleOptions}
              value={lifestyle as (typeof lifestyleOptions)[number]['value']}
              onChange={(v) => setLifestyle(v)}
            />

            <ChipGroup
              legend="Evdə nə var?"
              options={amenityOptions}
              values={amenities as (typeof amenityOptions)[number]['value'][]}
              onToggle={(v) => toggleAmenity(v)}
            />

            <Checkbox
              label="Yalnız tələbələrə"
              description="Elan tələbə olmayan istifadəçilərə göstərilməyəcək"
              defaultChecked
            />
          </Panel>
        </Section>

        {/* --- Stepper --- */}
        <Section
          title="Çoxaddımlı forma"
          note="Mobil-də irəliləyiş zolağı, desktopda addım adları — eyni məlumat."
        >
          <Panel className="flex flex-col gap-6 p-5 sm:p-6">
            <Stepper steps={steps} current={step} />
            <Well>
              <p className="text-body text-stone-700">
                {steps[step]?.label} addımının məzmunu burada olur.
              </p>
            </Well>
            <StepperActions
              sticky={false}
              onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
              onNext={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
              isLast={step === steps.length - 1}
            />
          </Panel>
        </Section>

        {/* --- Kartlar --- */}
        <Section title="Səthlər">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card interactive>
              <CardHeader>
                <CardTitle>Kliklənən kart</CardTitle>
              </CardHeader>
              <CardBody className="text-sm text-stone-600">
                Kursoru üstünə gətirəndə kölgə dərinləşir.
              </CardBody>
            </Card>
            <Panel className="p-5">
              <CardTitle>Panel</CardTitle>
              <p className="mt-2 text-sm text-stone-600">
                Səhifə bölmələri və form qutuları üçün, daha yumşaq künclə.
              </p>
            </Panel>
            <ListingCardSkeleton />
          </div>
        </Section>

        {/* --- Boş ekranlar --- */}
        <Section
          title="Boş ekranlar"
          note="Ton qaydası: boş nəticə istifadəçinin səhvi kimi oxunmamalıdır."
        >
          <div className="flex flex-col gap-4">
            <NoListingsFound
              onChangeFilters={() => undefined}
              onCreateAlert={() => undefined}
            />
            <NoRoommatesFound onChangeFilters={() => undefined} />
            <div className="grid gap-4 lg:grid-cols-2">
              <NoSavedItems />
              <NoOwnListings />
            </div>
            <EmptyState
              title="Öz halınızı yaza bilərsiniz"
              description="EmptyState komponenti ikon, başlıq, izah və istənilən hərəkəti qəbul edir."
              actions={<Button variant="tertiary">Nümunə düymə</Button>}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-h2 text-stone-900">{title}</h2>
      {note && <p className="mt-1 text-sm text-stone-500">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-stone-800">{label}</p>
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </div>
  );
}

function Swatches({
  name,
  shades,
  prefix,
  darkFrom,
}: {
  name: string;
  shades: string[];
  prefix: string;
  /** Bu indeksdən sonrakı fonlarda mətn ağ olur. */
  darkFrom: number;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-stone-800">{name}</p>
      <div className="flex overflow-hidden rounded-[var(--radius-input)] ring-1 ring-stone-200/70">
        {shades.map((shade, i) => (
          <div
            key={shade}
            className={`${prefix}-${shade} flex h-16 flex-1 items-end justify-center pb-1.5`}
          >
            <span
              className={`text-2xs font-semibold ${i >= darkFrom ? 'text-white/80' : 'text-stone-600'}`}
            >
              {shade}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
