'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, UserRound } from 'lucide-react';
import {
  genderPreferenceOnboardingOptions,
  lifestyleOptions,
  lookingForOptions,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEPS,
  petsOptions,
  smokingOptions,
  toManat,
  toQepik,
  type CityDto,
  type MajorDto,
  type OnboardingStepId,
  type OwnStudentProfileDto,
  type UniversityDto,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { ButtonLink } from '@/components/ui/button';
import { Panel, Skeleton } from '@/components/ui/card';
import { ChoiceGroup, Field, Input, Select } from '@/components/ui/field';
import { Stepper, StepperActions } from '@/components/ui/stepper';
import { PrivacyToggle } from './privacy-toggle';
import { cn } from '@/lib/cn';

/**
 * Tələbə onboarding axını — 9 addım  (PROMPT C1)
 *
 * Uzun tək forma DEYİL: hər ekranda bir sual var və hər addım ayrıca serverə
 * yazılır. İstifadəçi brauzeri bağlasa, geri qayıdanda `onboardingStep`-ə görə
 * qaldığı yerdən davam edir.
 *
 * Daxil olmayan istifadəçi üçün nümayiş rejimi işləyir: axın gəzilə bilir, amma
 * cavablar saxlanılmır və bu, yuxarıda açıq şəkildə yazılır.
 */

type Answers = {
  lookingFor?: string;
  cityId?: string;
  universityId?: string;
  majorId?: string | null;
  budgetMinManat?: string;
  budgetMaxManat?: string;
  lifestyle?: string;
  smoking?: string;
  petsAttitude?: string;
  genderPreference?: string;
};

type Privacy = Record<string, boolean>;

const DEFAULT_PRIVACY: Privacy = Object.fromEntries(
  ONBOARDING_STEPS.filter((s) => s.privacyField).map((s) => [
    s.privacyField as string,
    s.defaultPublic ?? true,
  ]),
);

export function OnboardingFlow() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [privacy, setPrivacy] = useState<Privacy>(DEFAULT_PRIVACY);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const [cities, setCities] = useState<CityDto[]>([]);
  const [universities, setUniversities] = useState<UniversityDto[]>([]);
  const [majors, setMajors] = useState<MajorDto[]>([]);

  const step = ONBOARDING_STEPS[stepIndex];

  // --- Başlanğıc: profil + şəhər siyahısı ---------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [profile, cityList] = await Promise.all([
        api.get<OwnStudentProfileDto>('/me/student-profile').catch((e: unknown) => {
          if (e instanceof ApiRequestError && e.status === 401) return null;
          throw e;
        }),
        api.get<CityDto[]>('/taxonomy/cities').catch(() => [] as CityDto[]),
      ]);

      if (cancelled) return;

      setCities(cityList);

      /*
        Giriş yoxdursa axın BAŞLAMIR.

        Əvvəl burada "nümayiş rejimi" açılırdı: giriş etməmiş adam doqquz
        addımın hamısını doldurur, sonda "cavablar saxlanılmadı" yazısını
        görürdü. Doldurulmuş forma itiriləndə istifadəçi yenidən başlamır —
        gedir. Profil isə şəxsi məlumatdır və onu hesabsız yazmaq onsuz da
        mümkün deyil, ona görə düzgün cavab əvvəldən girişi istəməkdir.
      */
      if (!profile) {
        setNeedsAuth(true);
      } else {
        applyProfile(profile);
      }
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setNeedsAuth(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyProfile = (p: OwnStudentProfileDto) => {
    setAnswers({
      lookingFor: p.lookingFor ?? undefined,
      cityId: p.cityId ?? undefined,
      universityId: p.universityId ?? undefined,
      majorId: p.majorId,
      budgetMinManat: p.budgetMin != null ? String(toManat(p.budgetMin)) : undefined,
      budgetMaxManat: p.budgetMax != null ? String(toManat(p.budgetMax)) : undefined,
      lifestyle: p.lifestyle ?? undefined,
      smoking: p.smoking ?? undefined,
      petsAttitude: p.petsAttitude ?? undefined,
      genderPreference: p.genderPreference ?? undefined,
    });
    setPrivacy({ ...DEFAULT_PRIVACY, ...p.privacy });
    setMaxReached(p.onboardingStep);
    // Yarımçıq qalan yerdən davam: son keçilmiş addımdan sonrakı ekran açılır.
    setStepIndex(Math.min(p.onboardingStep, ONBOARDING_STEP_COUNT - 1));
    if (p.onboardingStep >= ONBOARDING_STEP_COUNT) setFinished(true);
  };

  // --- Şəhər seçiləndə universitet siyahısı gəlir --------------------------
  useEffect(() => {
    if (!answers.cityId) return;
    api
      .get<UniversityDto[]>('/taxonomy/universities', { cityId: answers.cityId })
      .then(setUniversities)
      .catch(() => setUniversities([]));
  }, [answers.cityId]);

  // "Digər" universiteti heç bir şəhərə bağlı deyil, ona görə ayrıca gətirilir.
  const [otherUniversity, setOtherUniversity] = useState<UniversityDto | null>(null);
  useEffect(() => {
    api
      .get<UniversityDto[]>('/taxonomy/universities')
      .then((all) => setOtherUniversity(all.find((u) => u.isOther) ?? null))
      .catch(() => setOtherUniversity(null));
  }, []);

  useEffect(() => {
    if (stepIndex !== 3 || majors.length > 0) return;
    api
      .get<MajorDto[]>('/taxonomy/majors')
      .then(setMajors)
      .catch(() => setMajors([]));
  }, [stepIndex, majors.length]);

  const universityOptions = useMemo(() => {
    const list = [...universities];
    if (otherUniversity && !list.some((u) => u.id === otherUniversity.id)) {
      list.push(otherUniversity);
    }
    return list;
  }, [universities, otherUniversity]);

  // --- Saxlama -------------------------------------------------------------

  const persist = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const updated = await api.patch<OwnStudentProfileDto>('/me/onboarding', body);
        setMaxReached(updated.onboardingStep);
        return true;
      } catch (e) {
        setError(
          e instanceof ApiRequestError
            ? (e.fieldError('budgetMax') ?? e.message)
            : 'Saxlanmadı. Bir azdan yenidən cəhd edin.',
        );
        return false;
      }
    },
    [],
  );

  const buildPayload = (id: OnboardingStepId): Record<string, unknown> | null => {
    const isPublic = step?.privacyField ? privacy[step.privacyField] : undefined;

    switch (id) {
      case 'lookingFor':
        return answers.lookingFor
          ? { step: id, lookingFor: answers.lookingFor, isPublic }
          : null;
      case 'city':
        return answers.cityId ? { step: id, cityId: answers.cityId } : null;
      case 'university':
        return answers.universityId
          ? { step: id, universityId: answers.universityId, isPublic }
          : null;
      case 'major':
        return { step: id, majorId: answers.majorId ?? null, isPublic };
      case 'budget': {
        const min = Number(answers.budgetMinManat);
        const max = Number(answers.budgetMaxManat);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
        return { step: id, budgetMin: toQepik(min), budgetMax: toQepik(max), isPublic };
      }
      case 'lifestyle':
        return answers.lifestyle ? { step: id, lifestyle: answers.lifestyle, isPublic } : null;
      case 'smoking':
        return answers.smoking ? { step: id, smoking: answers.smoking, isPublic } : null;
      case 'pets':
        return answers.petsAttitude
          ? { step: id, petsAttitude: answers.petsAttitude, isPublic }
          : null;
      case 'gender':
        return answers.genderPreference
          ? { step: id, genderPreference: answers.genderPreference, isPublic }
          : null;
    }
  };

  const goNext = async () => {
    if (!step) return;
    const payload = buildPayload(step.id);
    if (!payload) return;

    setSaving(true);
    setError(null);
    const ok = await persist(payload);
    setSaving(false);
    if (!ok) return;

    setMaxReached((m) => Math.max(m, stepIndex + 1));
    if (stepIndex === ONBOARDING_STEP_COUNT - 1) {
      await api.post('/auth/onboarding/complete').catch(() => undefined);
      setFinished(true);
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const skip = async () => {
    if (!step?.optional) return;
    setSaving(true);
    await api.post('/me/onboarding/skip', { step: step.id }).catch(() => undefined);
    setSaving(false);
    setMaxReached((m) => Math.max(m, stepIndex + 1));
    setStepIndex((i) => i + 1);
  };

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  };

  // --- Render --------------------------------------------------------------

  if (loading) return <OnboardingSkeleton />;
  if (needsAuth) return <OnboardingSignInPrompt />;
  if (finished) return <OnboardingDone />;
  if (!step) return null;

  const canContinue = buildPayload(step.id) !== null;

  return (
    <div className="flex flex-col gap-6">
      <Stepper
        steps={ONBOARDING_STEPS.map((s) => ({ id: s.id, label: s.label }))}
        current={stepIndex}
      />

      <Panel className="flex flex-col gap-6 p-5 sm:p-7">
        <div>
          <h1 className="text-h2 text-stone-900">{step.question}</h1>
          {step.hint && (
            <p className="mt-1.5 text-body leading-relaxed text-stone-600">{step.hint}</p>
          )}
        </div>

        <StepFields
          stepId={step.id}
          answers={answers}
          setAnswers={setAnswers}
          cities={cities}
          universities={universityOptions}
          majors={majors}
          error={error}
        />

        {step.privacyField && (
          <PrivacyToggle
            checked={privacy[step.privacyField] ?? true}
            onChange={(v) =>
              setPrivacy((p) => ({ ...p, [step.privacyField as string]: v }))
            }
            note={
              step.defaultPublic === false
                ? 'Bu məlumat həssasdır — default olaraq gizlidir. Bağlı qalsa da uyğunluq hesablamasında istifadə olunur.'
                : undefined
            }
          />
        )}

        {step.id === 'city' && (
          <p className="text-2xs leading-relaxed text-stone-500">
            Şəhər həmişə görünür — axtarışın və uyğunluq hesablamasının işləməsi üçün
            lazımdır.
          </p>
        )}

        {error && !error.includes('büdcə') && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}

        <StepperActions
          sticky={false}
          onBack={stepIndex > 0 ? goBack : undefined}
          onNext={goNext}
          nextDisabled={!canContinue}
          loading={saving}
          isLast={stepIndex === ONBOARDING_STEP_COUNT - 1}
        >
          {step.optional && (
            <button
              type="button"
              onClick={skip}
              className="h-11 px-4 text-body font-semibold text-stone-600 underline-offset-4 hover:text-forest-600 hover:underline sm:mr-auto"
            >
              Ötür
            </button>
          )}
        </StepperActions>
      </Panel>

      <p className="text-center text-2xs text-stone-500">
        {maxReached} / {ONBOARDING_STEP_COUNT} addım saxlanılıb — istənilən vaxt ara verib
        sonra davam edə bilərsən.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Addımların məzmunu
// ---------------------------------------------------------------------------

function StepFields({
  stepId,
  answers,
  setAnswers,
  cities,
  universities,
  majors,
  error,
}: {
  stepId: OnboardingStepId;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  cities: CityDto[];
  universities: UniversityDto[];
  majors: MajorDto[];
  error: string | null;
}) {
  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));

  switch (stepId) {
    case 'lookingFor':
      return (
        <ChoiceGroup
          name="lookingFor"
          legend="Variantlardan birini seç"
          options={lookingForOptions}
          value={answers.lookingFor as never}
          onChange={(v) => set({ lookingFor: v })}
        />
      );

    case 'city':
      return (
        <Field label="Şəhər" required>
          {(p) => (
            <Select
              value={answers.cityId ?? ''}
              onChange={(e) => set({ cityId: e.target.value, universityId: undefined })}
              {...p}
            >
              <option value="" disabled>
                Şəhər seç
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );

    case 'university':
      return (
        <Field
          label="Universitet"
          required
          hint={
            universities.length === 0
              ? 'Əvvəlcə şəhəri seçin — universitet siyahısı ona görə gəlir.'
              : undefined
          }
        >
          {(p) => (
            <Select
              value={answers.universityId ?? ''}
              onChange={(e) => set({ universityId: e.target.value })}
              {...p}
            >
              <option value="" disabled>
                Universitet seç
              </option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.shortName ? `${u.name} (${u.shortName})` : u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );

    case 'major':
      return (
        <Field label="İxtisas" hint="Məcburi deyil — istəsən ötürə bilərsən.">
          {(p) => (
            <Select
              value={answers.majorId ?? ''}
              onChange={(e) => set({ majorId: e.target.value || null })}
              {...p}
            >
              <option value="">Seçilməyib</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );

    case 'budget':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum" required>
            {(p) => (
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                prefix="AZN"
                placeholder="250"
                value={answers.budgetMinManat ?? ''}
                onChange={(e) => set({ budgetMinManat: e.target.value })}
                {...p}
              />
            )}
          </Field>
          <Field
            label="Maksimum"
            required
            error={error?.includes('büdcə') ? error : undefined}
          >
            {(p) => (
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                prefix="AZN"
                placeholder="500"
                value={answers.budgetMaxManat ?? ''}
                onChange={(e) => set({ budgetMaxManat: e.target.value })}
                {...p}
              />
            )}
          </Field>
        </div>
      );

    case 'lifestyle':
      return (
        <ChoiceGroup
          name="lifestyle"
          legend="Sənə hansı daha yaxındır?"
          options={lifestyleOptions}
          value={answers.lifestyle as never}
          onChange={(v) => set({ lifestyle: v })}
        />
      );

    case 'smoking':
      return (
        <ChoiceGroup
          name="smoking"
          legend="Variantlardan birini seç"
          options={smokingOptions}
          value={answers.smoking as never}
          onChange={(v) => set({ smoking: v })}
        />
      );

    case 'pets':
      return (
        <ChoiceGroup
          name="pets"
          legend="Variantlardan birini seç"
          options={petsOptions}
          value={answers.petsAttitude as never}
          onChange={(v) => set({ petsAttitude: v })}
        />
      );

    case 'gender':
      return (
        <ChoiceGroup
          name="gender"
          legend="Variantlardan birini seç"
          options={genderPreferenceOnboardingOptions}
          value={answers.genderPreference as never}
          onChange={(v) => set({ genderPreference: v })}
        />
      );
  }
}

// ---------------------------------------------------------------------------

function OnboardingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10" />
      <Panel className="flex flex-col gap-5 p-5 sm:p-7">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-11 w-32 self-end" />
      </Panel>
    </div>
  );
}

/** Giriş etməmiş istifadəçi — axın başlamır, əvvəlcə hesab lazımdır. */
function OnboardingSignInPrompt() {
  return (
    <Panel className="flex flex-col items-center px-6 py-14 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-sprout-100 text-forest-600"
      >
        <UserRound className="size-7" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 text-h2 text-stone-900">Əvvəlcə daxil ol</h1>
      <p className="mt-2 max-w-md text-body leading-relaxed text-stone-600">
        Cavablar profilinə yazılır, ona görə hesab olmadan saxlanıla bilmir.
        Qeydiyyat bir neçə dəqiqə çəkir — sonra düz bu yerdən davam edirsən.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <ButtonLink href="/qeydiyyat">Qeydiyyatdan keç</ButtonLink>
        <ButtonLink href="/giris?davam=/basla" variant="tertiary">
          Daxil ol
        </ButtonLink>
      </div>
    </Panel>
  );
}

function OnboardingDone() {
  return (
    <Panel className={cn('flex flex-col items-center px-6 py-14 text-center')}>
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-sprout-100 text-forest-600"
      >
        <CheckCircle2 className="size-7" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 text-h2 text-stone-900">Profilin hazırdır</h1>
      <p className="mt-2 max-w-md text-body leading-relaxed text-stone-600">
        İndi uyğunluq skoru hesablana bilər. Cavabları istənilən vaxt profil
        bölməsindən dəyişə bilərsən.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <ButtonLink href="/otaq-yoldasi">Uyğun profillərə bax</ButtonLink>
        <ButtonLink href="/axtaris" variant="tertiary">
          Elanlara bax
        </ButtonLink>
      </div>
    </Panel>
  );
}
