'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  amenityLabels,
  Amenity,
  GuestRule,
  guestRuleLabels,
  LISTING,
  PROXIMITY_MINUTES,
  PROXIMITY_MINUTES_MAX,
  PROXIMITY_MINUTES_MIN,
  smokingRuleLabels,
  SmokingRule,
  type CityDto,
  type DistrictDto,
  type ListingDetailDto,
  type ListingImageDto,
  type ProximityMinutes,
  type SessionUserDto,
  type UniversityDto,
} from '@yasayis/shared';
import { useRouter } from 'next/navigation';
import { api, ApiRequestError } from '@/lib/api-client';
import { ExistingPhotos } from '../existing-photos';
import { MapPicker } from '../map-picker';
import { PhotoUploader, type LocalPhoto } from '../photo-uploader';
import { Panel, Skeleton } from '@/components/ui/card';
import { Checkbox, ChipGroup, Field, Input, Select, Textarea } from '@/components/ui/field';
import { Stepper, StepperActions } from '@/components/ui/stepper';
import { rejectionReason, uploadPhotos } from './upload-photos';
import {
  draftFromListing,
  errorsForStep,
  STEPS,
  toCreateInput,
  toUpdateInput,
  useListingDraft,
  validate,
  type Errors,
} from './use-listing-draft';
import { GateNotOwner, GateSignedOut, SubmittedNotice } from './states';

/**
 * Elan yerləşdirmə forması.
 *
 * ÜÇ ADDIM, bir uzun səhifə deyil. Elan formasında 20-dən çox sahə var və
 * hamısını bir ekranda göstərmək ev sahibini qorxudur: səhifə açılan kimi
 * "bu çox uzundur" qərarı verilir. Üç addımda hər ekranda 6–8 sahə qalır.
 *
 * AXIN — və bu, köhnə formada sınıq idi:
 *   1. Sessiya yoxlanılır. Qonaq → giriş. Ev sahibi rolu yoxdur → rolu aç.
 *      Köhnə forma bunu heç yoxlamırdı: istifadəçi bütün formanı doldurub
 *      sonda 403 alırdı və yazdıqları itirdi.
 *   2. Elan yaradılır (`POST /listings`) — status avtomatik `ACTIVE`.
 *   3. Şəkillər YARADILDIQDAN SONRA yüklənir, çünki yükləmə ünvanı elan
 *      id-si tələb edir. `createListingSchema`-dakı `imageIds` sahəsi server
 *      tərəfdə nəzərə alınmır — ona görə boş göndərilir.
 *
 * Şəkil yüklənməsi uğursuz olsa da elan İTMİR: yaradılıb və hesabdadır.
 * Bu halda istifadəçiyə hansı faylların keçmədiyi deyilir.
 */

const AMENITY_OPTIONS = (Object.keys(amenityLabels) as Amenity[]).map((value) => ({
  value,
  label: amenityLabels[value],
}));


type Gate = 'checking' | 'guest' | 'not-owner' | 'ready';

export function ListingForm({ editing }: { editing?: ListingDetailDto } = {}) {
  const router = useRouter();
  const { draft, set, reset } = useListingDraft(
    editing ? draftFromListing(editing) : undefined,
  );

  /** Redaktədə mövcud şəkillər ayrıca idarə olunur — onlar artıq serverdədir. */
  const [existingImages, setExistingImages] = useState<ListingImageDto[]>(
    editing?.images ?? [],
  );

  // Effektin asılılığı bütün `editing` obyekti deyil, yalnız sahibin id-sidir —
  // obyekt hər render-də yeni istinad olsa da sessiya sorğusu təkrarlanmasın.
  const ownerId = editing?.owner.id;

  const [gate, setGate] = useState<Gate>('checking');
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);

  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [done, setDone] = useState<{ listing: ListingDetailDto; failed: string[] } | null>(
    null,
  );

  const [cities, setCities] = useState<CityDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [universities, setUniversities] = useState<UniversityDto[]>([]);

  // --- Sessiya -------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    api
      .get<SessionUserDto>('/auth/me')
      .then((user) => {
        if (cancelled) return;
        // Redaktədə sahiblik də yoxlanılır: başqasının elanının formasını
        // doldurub sonda 403 almaq ən pis nəticədir.
        if (ownerId && ownerId !== user.id) {
          setGate('not-owner');
          return;
        }
        setGate(user.isOwner ? 'ready' : 'not-owner');
      })
      .catch(() => {
        if (!cancelled) setGate('guest');
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  // --- Taksonomiya ---------------------------------------------------------

  useEffect(() => {
    api
      .get<CityDto[]>('/taxonomy/cities')
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!draft.cityId) {
      setDistricts([]);
      setUniversities([]);
      return;
    }
    api
      .get<DistrictDto[]>('/taxonomy/districts', { cityId: draft.cityId })
      .then(setDistricts)
      .catch(() => setDistricts([]));
    api
      .get<UniversityDto[]>('/taxonomy/universities', { cityId: draft.cityId })
      .then((list) => setUniversities(list.filter((u) => !u.isOther)))
      .catch(() => setUniversities([]));
  }, [draft.cityId]);

  // --- Yoxlama -------------------------------------------------------------

  // Redaktədə mövcud şəkillər də sayılır — yoxsa forma "ən azı bir şəkil"
  // deyə şikayət edir, halbuki elanda onsuz da şəkil var.
  const totalPhotoCount = existingImages.length + photos.length;
  const localErrors = useMemo(
    () => validate(draft, totalPhotoCount),
    [draft, totalPhotoCount],
  );

  // Xəta yalnız istifadəçi "Davam et"-ə basandan sonra görünür: hər boş
  // sahəni dərhal qırmızı göstərmək formanı düşmən kimi göstərir.
  const visibleErrors: Errors = touched
    ? { ...localErrors, ...serverErrors }
    : serverErrors;

  const stepBlockers = errorsForStep(localErrors, step);
  const isLastStep = step === STEPS.length - 1;

  // --- Şəkillər ------------------------------------------------------------

  const addPhotos = (files: FileList) => {
    const room = LISTING.IMAGES_MAX - photos.length;
    const rejected: string[] = [];
    const accepted: LocalPhoto[] = [];

    for (const file of Array.from(files)) {
      if (accepted.length >= room) {
        rejected.push(`${file.name} — limit doldu`);
        continue;
      }
      const reason = rejectionReason(file);
      if (reason) {
        rejected.push(reason);
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setPhotos((current) => [...current, ...accepted]);
    setPhotoNotice(rejected.length > 0 ? rejected.join('\n') : null);
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const target = current.find((p) => p.id === id);
      // Yaddaşda qalan blob ünvanı boşaldılır — uzun sessiyada yığılır.
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((p) => p.id !== id);
    });
  };

  const movePhoto = (id: string, direction: -1 | 1) => {
    setPhotos((current) => {
      const index = current.findIndex((p) => p.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next]!, copy[index]!];
      return copy;
    });
  };

  // --- Göndərmə ------------------------------------------------------------

  const submit = async () => {
    setTouched(true);
    setServerErrors({});
    setFormError(null);

    if (Object.keys(localErrors).length > 0) {
      // Xəta başqa addımdadırsa istifadəçini ora aparırıq — "nəsə səhvdir,
      // amma harada bilinmir" vəziyyəti ən pisidir.
      const firstBad = STEPS.findIndex(
        (_, i) => Object.keys(errorsForStep(localErrors, i)).length > 0,
      );
      if (firstBad >= 0 && firstBad !== step) setStep(firstBad);
      return;
    }

    setSubmitting(true);
    setUploadedCount(0);

    try {
      if (editing) {
        const listing = await api.patch<ListingDetailDto>(
          `/listings/${editing.id}`,
          toUpdateInput(draft),
        );
        // Yeni əlavə edilmiş şəkillər mətn saxlandıqdan SONRA gedir: yükləmə
        // uzun çəkir və onu gözlətmək redaktənin itmə riskini artırır.
        const { failed } = await uploadPhotos(listing.id, photos, setUploadedCount);
        for (const photo of photos) URL.revokeObjectURL(photo.previewUrl);
        setPhotos([]);
        if (failed.length > 0) {
          setFormError(`Bu fayllar yüklənmədi: ${failed.join(', ')}`);
          setSubmitting(false);
          return;
        }
        router.push(`/elan/${listing.slug}`);
        router.refresh();
        return;
      }

      const listing = await api.post<ListingDetailDto>('/listings', toCreateInput(draft));
      const { failed } = await uploadPhotos(listing.id, photos, setUploadedCount);
      setDone({ listing, failed });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.fields) {
          // Server sahə adlarını "property.price" kimi qaytarır — son hissə
          // formadakı sahə adı ilə üst-üstə düşür.
          setServerErrors(
            Object.fromEntries(
              Object.entries(error.fields).map(([key, messages]) => [
                key.split('.').pop() ?? key,
                messages[0] ?? '',
              ]),
            ),
          );
          setFormError('Formada düzəliş lazımdır — qırmızı yazılara baxın.');
        } else if (error.status === 401 || error.status === 403) {
          setGate('not-owner');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('Elan göndərilmədi. Bir azdan yenidən cəhd edin.');
      }
      setSubmitting(false);
    }
  };

  const startNew = () => {
    for (const photo of photos) URL.revokeObjectURL(photo.previewUrl);
    setPhotos([]);
    setPhotoNotice(null);
    setTouched(false);
    setServerErrors({});
    setFormError(null);
    setSubmitting(false);
    setStep(0);
    setDone(null);
    reset();
  };

  // --- Görünüş -------------------------------------------------------------

  if (gate === 'checking') {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-panel)]" />
      </div>
    );
  }

  if (gate === 'guest') return <GateSignedOut />;
  if (gate === 'not-owner') return <GateNotOwner onEnabled={() => setGate('ready')} />;

  if (done) {
    return (
      <SubmittedNotice
        slug={done.listing.slug}
        failedPhotos={done.failed}
        onNew={startNew}
      />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <Panel className="flex flex-col gap-5 p-5 sm:p-6">
          <Field
            label="Elanın başlığı"
            required
            error={visibleErrors.title}
            hint="Nə kirayə verdiyinizi bir cümlədə yazın."
            aside={`${draft.title.length}/${LISTING.TITLE_MAX}`}
          >
            {(p) => (
              <Input
                {...p}
                value={draft.title}
                maxLength={LISTING.TITLE_MAX}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Nərimanovda 2 otaqlı mənzil, tələbələrə"
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Şəhər" required error={visibleErrors.cityId}>
              {(p) => (
                <Select
                  {...p}
                  value={draft.cityId}
                  onChange={(e) => {
                    set('cityId', e.target.value);
                    set('districtId', '');
                    set('proximities', []);
                  }}
                >
                  <option value="">Seçin</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Rayon" error={visibleErrors.districtId}>
              {(p) => (
                <Select
                  {...p}
                  value={draft.districtId}
                  disabled={districts.length === 0}
                  onChange={(e) => set('districtId', e.target.value)}
                >
                  <option value="">
                    {draft.cityId && districts.length === 0 ? 'Rayon yoxdur' : 'Seçin'}
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field
            label="Ünvan"
            error={visibleErrors.address}
            hint="Yalnız siz və moderator görür. Elanda ünvan göstərilmir, rayon göstərilir."
          >
            {(p) => (
              <Input
                {...p}
                value={draft.address}
                maxLength={240}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Nizami küç. 12, mənzil 34"
              />
            )}
          </Field>

          <MapPicker value={draft.coords} onChange={(c) => set('coords', c)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Aylıq qiymət" required error={visibleErrors.price}>
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  prefix="AZN"
                  value={draft.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="300"
                />
              )}
            </Field>

            <Field
              label="Depozit"
              error={visibleErrors.deposit}
              hint="Depozit yoxdursa boş buraxın."
            >
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  prefix="AZN"
                  value={draft.deposit}
                  onChange={(e) => set('deposit', e.target.value)}
                  placeholder="300"
                />
              )}
            </Field>
          </div>

          <Checkbox
            label="Kommunal xərclər qiymətə daxildir"
            description="Su, işıq, qaz və internet."
            checked={draft.utilitiesIncluded}
            onChange={(e) => set('utilitiesIncluded', e.target.checked)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Otaq sayı" required error={visibleErrors.roomCount}>
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={LISTING.ROOM_COUNT_MAX}
                  value={draft.roomCount}
                  onChange={(e) => set('roomCount', e.target.value)}
                />
              )}
            </Field>

            <Field
              label="Boş otaq"
              required
              error={visibleErrors.vacantRoomCount}
              hint="Bütöv mənzil verilirsə otaq sayı ilə eyni."
            >
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={LISTING.ROOM_COUNT_MAX}
                  value={draft.vacantRoomCount}
                  onChange={(e) => set('vacantRoomCount', e.target.value)}
                />
              )}
            </Field>

            <Field
              label="Hazırda yaşayan"
              required
              error={visibleErrors.currentOccupantsCount}
              hint="Heç kim yoxdursa 0."
            >
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.currentOccupantsCount}
                  onChange={(e) => set('currentOccupantsCount', e.target.value)}
                />
              )}
            </Field>
          </div>
        </Panel>
      )}

      {step === 1 && (
        <Panel className="flex flex-col gap-5 p-5 sm:p-6">
          <Field
            label="Təsvir"
            required
            error={visibleErrors.description}
            hint="Metro məsafəsi, mebel, qonşular, kommunal xərc — tələbənin bilmək istədikləri."
            aside={`${draft.description.length}/${LISTING.DESCRIPTION_MAX}`}
          >
            {(p) => (
              <Textarea
                {...p}
                rows={6}
                value={draft.description}
                maxLength={LISTING.DESCRIPTION_MAX}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Mənzil metroya 5 dəqiqəlik piyada məsafədədir, təmirlidir və tam mebellidir..."
              />
            )}
          </Field>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-1.5 text-sm font-semibold text-stone-800">
              Kimə uyğundur
            </legend>

            <Checkbox
              label="Tələbələr üçün uyğundur"
              description="Bu seçim elanı tələbə axtarışlarında önə çıxarır."
              checked={draft.suitableForStudents}
              onChange={(e) => set('suitableForStudents', e.target.checked)}
            />
            <Checkbox
              label="Qadınlar üçün"
              checked={draft.suitableForWomen}
              onChange={(e) => set('suitableForWomen', e.target.checked)}
            />
            <Checkbox
              label="Kişilər üçün"
              checked={draft.suitableForMen}
              onChange={(e) => set('suitableForMen', e.target.checked)}
              error={visibleErrors.suitableForWomen}
            />
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Siqaret">
              {(p) => (
                <Select
                  {...p}
                  value={draft.smokingRule}
                  onChange={(e) => set('smokingRule', e.target.value as SmokingRule)}
                >
                  {Object.entries(smokingRuleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Qonaq">
              {(p) => (
                <Select
                  {...p}
                  value={draft.guestRules}
                  onChange={(e) => set('guestRules', e.target.value as GuestRule)}
                >
                  {Object.entries(guestRuleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Checkbox
            label="Ev heyvanına icazə verilir"
            checked={draft.petsAllowed}
            onChange={(e) => set('petsAllowed', e.target.checked)}
          />

          <ChipGroup
            legend="Evdə nə var?"
            options={AMENITY_OPTIONS}
            values={draft.amenities}
            onToggle={(value) =>
              set(
                'amenities',
                draft.amenities.includes(value)
                  ? draft.amenities.filter((a) => a !== value)
                  : [...draft.amenities, value],
              )
            }
          />

          <ProximityPicker
            universities={universities}
            value={draft.proximities}
            onChange={(next) => set('proximities', next)}
            cityChosen={Boolean(draft.cityId)}
          />
        </Panel>
      )}

      {step === 2 && (
        <Panel className="flex flex-col gap-5 p-5 sm:p-6">
          {editing && (
            <ExistingPhotos
              listingId={editing.id}
              images={existingImages}
              onChange={setExistingImages}
            />
          )}

          <PhotoUploader
            photos={photos}
            onAdd={addPhotos}
            onRemove={removePhoto}
            onMove={movePhoto}
            error={visibleErrors.photos}
          />

          {photoNotice && (
            <p
              role="alert"
              className="whitespace-pre-line rounded-[var(--radius-input)] bg-warning-50 px-3.5 py-2.5 text-sm text-warning-600 ring-1 ring-warning-100"
            >
              {photoNotice}
            </p>
          )}

          <p className="rounded-[var(--radius-input)] bg-stone-100 px-3.5 py-3 text-sm leading-relaxed text-stone-600">
            {editing
              ? 'Dəyişikliklər dərhal qüvvəyə minir — elan axtarışdan çıxmır.'
              : 'Elan dərhal dərc olunur. Ən azı bir şəkil əlavə edilən kimi axtarışda görünəcək. Qaydalara uyğun olmayan elanlar sonradan dayandırıla bilər.'}
          </p>
        </Panel>
      )}

      {formError && (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600 ring-1 ring-danger-100"
        >
          {formError}
        </p>
      )}

      {submitting && photos.length > 0 && (
        <p role="status" className="tabular text-sm text-stone-600">
          Şəkillər yüklənir — {uploadedCount} / {photos.length}
        </p>
      )}

      <StepperActions
        onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
        onNext={
          isLastStep
            ? undefined
            : () => {
                setTouched(true);
                if (Object.keys(stepBlockers).length === 0) {
                  setTouched(false);
                  setStep((s) => s + 1);
                }
              }
        }
        isLast={isLastStep}
        submitLabel={editing ? 'Dəyişikliyi saxla' : 'Tamamla'}
        loading={submitting}
      />
    </form>
  );
}

/**
 * Universitetə piyada məsafə.
 *
 * Məsafə ƏL İLƏ seçilir, xəritədən hesablanmır: routing xidməti yoxdur və
 * uydurma "avtomatik hesablandı" rəqəmi elanın ən çox yoxlanan məlumatını
 * şübhəli edir. Ev sahibi onsuz da bilir ki, universitetə neçə dəqiqədir.
 */
function ProximityPicker({
  universities,
  value,
  onChange,
  cityChosen,
}: {
  universities: UniversityDto[];
  value: { universityId: string; minutes: ProximityMinutes }[];
  onChange: (next: { universityId: string; minutes: ProximityMinutes }[]) => void;
  cityChosen: boolean;
}) {
  if (!cityChosen) {
    return (
      <p className="text-sm text-stone-500">
        Universitetə yaxınlığı əlavə etmək üçün əvvəlcə şəhəri seçin.
      </p>
    );
  }

  if (universities.length === 0) return null;

  const chosen = new Map(value.map((v) => [v.universityId, v.minutes]));

  const setMinutes = (universityId: string, minutes: ProximityMinutes | null) => {
    const next = value.filter((v) => v.universityId !== universityId);
    if (minutes !== null) next.push({ universityId, minutes });
    onChange(next.slice(0, 6));
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold text-stone-800">
        Universitetə piyada məsafə
      </legend>
      <p className="mb-1 text-sm text-stone-500">
        Ən çox 6 universitet. Kartda ən yaxını göstərilir. Hazır variantlardan
        seçin və ya dəqiqəni əl ilə yazın.
      </p>

      <ul className="flex flex-col gap-2">
        {universities.slice(0, 10).map((uni) => (
          <ProximityRow
            key={uni.id}
            label={uni.shortName ?? uni.name}
            minutes={chosen.get(uni.id) ?? null}
            onChange={(m) => setMinutes(uni.id, m)}
          />
        ))}
      </ul>

      {universities.length > 10 && (
        <p className="mt-1 text-2xs text-stone-500">
          Siyahıda şəhərin ilk 10 universiteti var.{' '}
          <Link href="/elaqe" className="font-medium text-sprout-600 hover:underline">
            Başqası lazımdırsa bizə yazın.
          </Link>
        </p>
      )}
    </fieldset>
  );
}

/**
 * Bir universitet üçün məsafə seçimi.
 *
 * Hazır variantlar (5/10/15/30) sürətli seçim üçün qalır, amma dəyər ONLARLA
 * MƏHDUD DEYİL: "Digər" seçiləndə sərbəst dəqiqə sahəsi açılır. Əvvəl yalnız
 * dördlükdən biri mümkün idi və ev sahibi "7 dəqiqə" yaza bilmirdi — məcbur
 * olub yanlış rəqəm seçirdi.
 *
 * Sahə boş qalanda universitet siyahıdan tamamilə çıxarılır (`null`), yarımçıq
 * qeyd yaranmır.
 *
 * MOBİLDƏ ALT-ALTA. Əvvəl ad və seçim eyni sətirdə idi: universitet adları
 * uzundur ("Azərbaycan Dövlət Neft və Sənaye Universiteti") və dar ekranda ad
 * `truncate` ilə demək olar tamamilə kəsilirdi — istifadəçi hansı universiteti
 * seçdiyini görmürdü. İndi mobildə ad öz sətrində tam görünür, seçim isə
 * altında tam eni tutur. `sm:`-dən yuxarı köhnə yan-yana düzülüş qalır.
 */
function ProximityRow({
  label,
  minutes,
  onChange,
}: {
  label: string;
  minutes: number | null;
  onChange: (minutes: number | null) => void;
}) {
  const isPreset = minutes !== null && (PROXIMITY_MINUTES as readonly number[]).includes(minutes);
  const [manual, setManual] = useState(minutes !== null && !isPreset);

  return (
    <li className="flex flex-col gap-1.5 border-b border-stone-100 pb-2.5 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:border-0 sm:pb-0">
      <span className="min-w-0 text-sm text-stone-700 sm:truncate sm:text-body">
        {label}
      </span>

      <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
        {manual ? (
          <>
            <input
              type="number"
              inputMode="numeric"
              min={PROXIMITY_MINUTES_MIN}
              max={PROXIMITY_MINUTES_MAX}
              aria-label={`${label} — piyada məsafə (dəqiqə)`}
              value={minutes ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === '') {
                  onChange(null);
                  return;
                }
                const parsed = Number(raw);
                if (!Number.isFinite(parsed)) return;
                // Hədd kənarı dəyər saxlanmır — server onsuz da rədd edir.
                const clamped = Math.min(
                  PROXIMITY_MINUTES_MAX,
                  Math.max(PROXIMITY_MINUTES_MIN, Math.round(parsed)),
                );
                onChange(clamped);
              }}
              placeholder="dəq"
              className="h-9 w-full rounded-[var(--radius-input)] bg-white px-2.5 text-sm text-stone-900 ring-1 ring-stone-200 outline-none hover:ring-stone-300 focus:ring-2 focus:ring-forest-600 sm:w-20"
            />
            <button
              type="button"
              onClick={() => {
                setManual(false);
                onChange(null);
              }}
              className="shrink-0 text-2xs font-medium text-stone-500 hover:text-forest-700"
            >
              Siyahı
            </button>
          </>
        ) : (
          <select
            aria-label={`${label} — piyada məsafə`}
            value={minutes ?? ''}
            onChange={(e) => {
              if (e.target.value === 'manual') {
                setManual(true);
                onChange(null);
                return;
              }
              onChange(e.target.value ? Number(e.target.value) : null);
            }}
            className="h-9 w-full rounded-[var(--radius-input)] bg-white px-2.5 text-sm text-stone-900 ring-1 ring-stone-200 outline-none hover:ring-stone-300 focus:ring-2 focus:ring-forest-600 sm:w-auto sm:shrink-0"
          >
            <option value="">—</option>
            {PROXIMITY_MINUTES.map((m) => (
              <option key={m} value={m}>
                {m} dəq
              </option>
            ))}
            <option value="manual">Digər…</option>
          </select>
        )}
      </div>
    </li>
  );
}

export { ListingForm as default };
