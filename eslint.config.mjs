import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * ESLint — bütün workspace-lər üçün TƏK konfiqurasiya.
 *
 * Niyə kökdə və flat formatda:
 *   · ESLint 9 flat konfiqurasiyanı standart sayır, `.eslintrc` isə köhnəlib;
 *   · `next lint` Next 16-da silinir və konfiqurasiya olmayanda interaktiv
 *     quraşdırma sualı verir — bu, CI-da prosesi asır;
 *   · iki tətbiq (`api`, `web`) eyni qaydalarla yoxlanmalıdır, yoxsa hər
 *     paketdə fərqli üslub yaranır.
 *
 * `eslint-config-next` QƏSDƏN İŞLƏNMİR: o, `@rushstack/eslint-patch` vasitəsilə
 * ESLint-in modul yükləyicisini "yamaqlayır" və ESLint 9 flat konfiqurasiyası
 * ilə açılışda uçur ("Failed to patch ESLint"). Onun əsl dəyəri iki plagindir —
 * hər ikisi burada birbaşa qoşulub.
 *
 * Qaydalar QƏSDƏN azdır. Formatlaşdırma qaydaları yoxdur — onlar mübahisə
 * yaradır və kod baxışının vaxtını yeyir. Burada yalnız SƏHV tutan qaydalar var.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.next-audit/**',
      '**/generated/**',
      '**/*.tsbuildinfo',
      'packages/db/prisma/migrations/**',
      // Next özü yaradır və hər build-də üstündən yazır.
      'apps/web/next-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // İstifadə olunmayan dəyişən adətən yarımçıq refaktorun izidir.
      // `_` ilə başlayanlar qəsdən saxlanılır (məsələn ötürülən parametrlər).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // `any` tam qadağan deyil: xarici kitabxana tipləri bəzən onu tələb edir.
      // Amma xəbərdarlıq qalır ki, təsadüfən yayılmasın.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Boş `catch {}` bloku qəsdən işlənir (şəbəkə xətasını udmaq üçün),
      // ona görə yalnız boş funksiya gövdəsi xəbərdarlıq verir.
      '@typescript-eslint/no-empty-function': 'warn',

      // Konsola yazmaq istehsalatda log kanalını çirkləndirir; xəta və
      // xəbərdarlıq isə qalır.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // --- Web: React hook-ları və əlçatanlıq ----------------------------------
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      // Hook qaydaları həqiqi səhv tutur: yanlış asılılıq siyahısı köhnəlmiş
      // dəyərlə render deməkdir və bunu gözlə görmək demək olar ki, mümkün deyil.
      ...reactHooks.configs.recommended.rules,

      // Əlçatanlıqda yalnız avtomatik dəqiq tutulan qaydalar — qalanı
      // yanlış siqnal verir və vaxtla söndürülür.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/label-has-associated-control': 'warn',
    },
  },

  // --- API: NestJS dekoratorları -------------------------------------------
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      // NestJS-də konstruktor parametrləri dekorator vasitəsilə işlənir və
      // bəzi metod imzaları interfeys tələbi olaraq boş qalır.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },

  /*
    Node mühitində işləyən fayllar: skriptlər, seed və konfiqurasiya.

    Onlarda `process`, `console` və `fetch` qlobal olaraq mövcuddur — bunu
    açıq bildirmək lazımdır, yoxsa `no-undef` hər sətirdə səhv siqnal verir.
    Konsola yazmaq isə burada məhz iş görməkdir, çirklənmə deyil.
  */
  {
    files: [
      '**/scripts/**',
      '**/prisma/seed*.ts',
      '**/*.mjs',
      '**/*.config.{js,mjs,ts}',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: { 'no-console': 'off' },
  },
);
