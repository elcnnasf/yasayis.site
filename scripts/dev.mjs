/**
 * Development runner — API və web-i paralel qaldırır.
 *
 * Niyə ayrıca skript: root `package.json`-da `cmd1 & cmd2` yazmaq POSIX
 * qabığında paralel işləyir, Windows cmd.exe-də isə ARDICIL. API heç vaxt
 * bitmədiyi üçün orada web ümumiyyətlə başlamırdı. `concurrently` əlavə
 * asılılıq gətirir; bu skript eyni işi sıfır asılılıqla görür.
 */
import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

/** Hər prosesin öz rəngi olsun ki, qarışıq log-da kimin nə dediyi bilinsin. */
const TARGETS = [
  { name: 'api', workspace: '@yasayis/api', color: '\x1b[36m' },
  { name: 'web', workspace: '@yasayis/web', color: '\x1b[32m' },
];

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const children = [];
let shuttingDown = false;

/** Sətir-sətir prefiks vurur — yarımçıq gələn chunk-lar bir-birinə qarışmasın. */
function prefixer(name, color) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      process.stdout.write(`${color}[${name}]${RESET} ${line}\n`);
    }
  };
}

for (const { name, workspace, color } of TARGETS) {
  const child = spawn('npm', ['run', 'dev', `--workspace=${workspace}`], {
    // Windows-da `npm` .cmd shim-dir, shell olmadan spawn edilə bilmir.
    shell: isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  child.stdout.on('data', prefixer(name, color));
  child.stderr.on('data', prefixer(name, color));

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    process.stdout.write(
      `${color}[${name}]${RESET} ${DIM}dayandı (${signal ?? `kod ${code}`})${RESET}\n`,
    );
    // Biri düşəndə o birini asılı qoymuruq — yarımçıq mühit çaşdırıcıdır.
    shutdown(code ?? 1);
  });

  children.push({ name, child });
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  // Uşaq proseslərə bağlanmaq üçün qısa möhlət, sonra çıxırıq.
  setTimeout(() => process.exit(code), 400).unref();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

process.stdout.write(
  `${DIM}api → http://localhost:4000${'  '}·${'  '}web → http://localhost:3000${RESET}\n`,
);
