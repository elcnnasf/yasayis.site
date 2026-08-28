'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Send, UserRound } from 'lucide-react';
import {
  MESSAGE,
  type MessageThreadDetailDto,
  type MessageThreadDto,
} from '@yasayis/shared';
import { api, ApiRequestError, messageOf } from '@/lib/api-client';
import { relativeTime } from '@/lib/notifications';
import { EmptyState } from '@/components/empty/empty-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { Panel, Skeleton } from '@/components/ui/card';
import { Textarea } from '@/components/ui/field';
import { cn } from '@/lib/cn';

/**
 * Mesajlar.
 *
 * İKİ PANEL, BİR SƏHİFƏ. Desktopda solda söhbət siyahısı, sağda yazışma;
 * mobil-də isə eyni anda YALNIZ BİRİ göstərilir — dar ekranda iki paneli
 * yan-yana sıxmaq hər ikisini yararsız edir. Söhbət seçiləndə siyahı gizlənir,
 * "geri" düyməsi qaytarır.
 *
 * Real vaxt kanalı YOXDUR. Yeni mesaj səhifə açılanda və göndərişdən sonra
 * yüklənir. WebSocket bu ölçüdə platformada həm artıq mürəkkəblik, həm də
 * daimi açıq bağlantı deməkdir; MVP sərhədi "mürəkkəb daxili chat"i onsuz da
 * istisna edir.
 */

interface Selection {
  partnerId: string;
  listingId: string | null;
}

const sameThread = (a: Selection | null, t: MessageThreadDto): boolean =>
  a !== null && a.partnerId === t.partner.userId && a.listingId === (t.listing?.id ?? null);

export function MessagesView() {
  const [threads, setThreads] = useState<MessageThreadDto[] | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      setThreads(await api.get<MessageThreadDto[]>('/me/messages'));
      setNeedsAuth(false);
    } catch (e) {
      if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
        setNeedsAuth(true);
      }
      setThreads([]);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  if (needsAuth) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Mesajları görmək üçün daxil ol."
        description="Yazışmalar hesabına bağlıdır — kim olduğunu bilmədən mesaj göstərə bilmərik."
        actions={<ButtonLink href="/giris?davam=/panel/mesajlar">Daxil ol</ButtonLink>}
      />
    );
  }

  if (threads === null) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Hələ yazışman yoxdur."
        description="Elan səhifəsində «Mesaj yaz» düyməsi ilə ev sahibinə yaza bilərsən — nömrə əlavə etməyən sahiblərlə əlaqənin yolu budur."
        actions={<ButtonLink href="/axtaris">Elanlara bax</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
      {/* Mobil-də söhbət açılanda siyahı gizlənir. */}
      <div className={cn('flex flex-col gap-2', selected && 'hidden lg:flex')}>
        {threads.map((t) => (
          <ThreadRow
            key={`${t.partner.userId}:${t.listing?.id ?? ''}`}
            thread={t}
            active={sameThread(selected, t)}
            onOpen={() =>
              setSelected({ partnerId: t.partner.userId, listingId: t.listing?.id ?? null })
            }
          />
        ))}
      </div>

      <div className={cn(!selected && 'hidden lg:block')}>
        {selected ? (
          <Conversation
            key={`${selected.partnerId}:${selected.listingId ?? ''}`}
            selection={selected}
            onBack={() => setSelected(null)}
            onSent={() => void loadThreads()}
          />
        ) : (
          <Panel className="hidden items-center justify-center p-10 text-center lg:flex">
            <p className="text-body text-stone-500">Sol tərəfdən söhbət seçin.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function ThreadRow({
  thread,
  active,
  onOpen,
}: {
  thread: MessageThreadDto;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-start gap-3 rounded-[var(--radius-card)] bg-white p-3.5 text-left ring-1 transition-shadow',
        active ? 'ring-forest-600' : 'ring-stone-200 hover:ring-stone-300',
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-400">
        <UserRound className="size-5" strokeWidth={1.6} aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-body font-semibold text-stone-900">
            {thread.partner.fullName}
          </span>
          <span className="shrink-0 text-2xs text-stone-400">
            {relativeTime(thread.lastMessage.createdAt)}
          </span>
        </span>

        {thread.listing && (
          <span className="mt-0.5 block truncate text-2xs text-forest-700">
            {thread.listing.title}
          </span>
        )}

        <span className="mt-1 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm text-stone-600">
            {thread.lastMessage.mine && 'Siz: '}
            {thread.lastMessage.body}
          </span>
          {thread.unreadCount > 0 && (
            <span className="tabular grid min-w-5 shrink-0 place-items-center rounded-full bg-sprout-600 px-1.5 text-2xs font-bold text-white">
              {thread.unreadCount}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function Conversation({
  selection,
  onBack,
  onSent,
}: {
  selection: Selection;
  onBack: () => void;
  onSent: () => void;
}) {
  const [data, setData] = useState<MessageThreadDetailDto | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const query = selection.listingId ? { listingId: selection.listingId } : undefined;

  const load = useCallback(async () => {
    const res = await api
      .get<MessageThreadDetailDto>(`/me/messages/${selection.partnerId}`, query)
      .catch(() => null);
    if (res) setData(res);

    // Açılan söhbətdəki gələn mesajlar oxunmuş sayılır.
    await api
      .post(`/me/messages/${selection.partnerId}/read${
        selection.listingId ? `?listingId=${selection.listingId}` : ''
      }`)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.partnerId, selection.listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [data]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await api.post('/me/messages', {
        recipientId: selection.partnerId,
        listingId: selection.listingId,
        body: body.trim(),
      });
      setBody('');
      await load();
      onSent();
    } catch (e) {
      setError(messageOf(e, 'Mesaj göndərilmədi. Bir azdan yenidən cəhd edin.'));
    }

    setBusy(false);
  };

  if (!data) return <Skeleton className="h-96 w-full rounded-[var(--radius-panel)]" />;

  return (
    <Panel className="flex h-[32rem] flex-col p-0">
      <div className="flex items-center gap-2 border-b border-stone-200/70 p-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Söhbətlərə qayıt"
          className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-input)] text-stone-500 hover:bg-stone-100 lg:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-stone-900">
            {data.partner.fullName}
          </p>
          {data.listing && (
            <Link
              href={`/elan/${data.listing.slug}`}
              className="block truncate text-2xs text-forest-700 hover:underline"
            >
              {data.listing.title}
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3.5">
        {data.items.length === 0 && (
          <p className="my-auto text-center text-sm text-stone-500">
            Hələ mesaj yoxdur — birinci siz yazın.
          </p>
        )}

        {data.items.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[85%] rounded-[var(--radius-input)] px-3 py-2',
              m.mine
                ? 'self-end bg-sprout-600 text-white'
                : 'self-start bg-stone-100 text-stone-800',
            )}
          >
            <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
            <p
              className={cn(
                'mt-0.5 text-[0.625rem]',
                m.mine ? 'text-white/70' : 'text-stone-500',
              )}
            >
              {relativeTime(m.createdAt)}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex flex-col gap-2 border-t border-stone-200/70 p-3.5">
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <Textarea
          rows={2}
          maxLength={MESSAGE.BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mesaj yazın…"
          aria-label="Mesaj"
        />
        <Button type="submit" size="sm" loading={busy} disabled={!body.trim()}>
          <Send className="size-4" aria-hidden />
          Göndər
        </Button>
      </form>
    </Panel>
  );
}
