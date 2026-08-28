import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MessageDto,
  MessageThreadDetailDto,
  MessageThreadDto,
  SendMessageInput,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Daxili mesajlaşma.
 *
 * NİYƏ LAZIM OLDU
 * Elan sahibi telefon nömrəsi əlavə etməyibsə, tələbənin onunla əlaqə saxlamaq
 * üçün heç bir yolu qalmırdı: "Əlaqə saxla" düyməsi söndürülü dayanırdı və elan
 * praktik olaraq ölü idi. `Message` cədvəli bazada var idi, amma onu oxuyan-
 * yazan endpoint yox idi.
 *
 * SÖHBƏT NƏDİR
 * Söhbət cütlük + ELAN üzrə qruplaşdırılır: eyni ev sahibi ilə iki fərqli elan
 * barədə yazışma iki ayrı söhbətdir. Əks halda "hansı ev haqqında danışırıq"
 * sualı yazışmanın içində itir.
 *
 * NƏ YOXDUR
 * Real vaxt kanalı, "yazır..." göstəricisi, fayl göndərmə, qrup söhbəti. MVP
 * sərhədi "mürəkkəb daxili chat"i istisna edir — bu, ondan qəsdən sadədir.
 */
@Injectable()
export class MessagesService {
  /** Bir sorğuda qaytarılan maksimum mesaj. */
  private static readonly PAGE_SIZE = 100;
  /** Söhbət siyahısında maksimum sətir. */
  private static readonly THREAD_LIMIT = 50;

  constructor(private readonly prisma: PrismaService) {}

  async send(senderId: string, input: SendMessageInput): Promise<MessageDto> {
    if (input.recipientId === senderId) {
      throw new BadRequestException('Özünüzə mesaj yaza bilməzsiniz');
    }

    const recipient = await this.prisma.user.findFirst({
      where: { id: input.recipientId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!recipient) throw new NotFoundException('İstifadəçi tapılmadı');

    /*
      Elan göstərilibsə, o, HƏQİQƏTƏN qarşı tərəfin elanı olmalıdır. Onsuz
      istənilən elanın id-sini yazıb söhbətə yad başlıq yapışdırmaq olardı.
      Qarşı tərəf elanın sahibi deyilsə (ev sahibi tələbəyə cavab yazır),
      göndərənin sahibliyi yoxlanılır.
    */
    if (input.listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: input.listingId },
        select: { property: { select: { ownerId: true } } },
      });
      const ownerId = listing?.property.ownerId;
      if (!ownerId || (ownerId !== input.recipientId && ownerId !== senderId)) {
        throw new ForbiddenException('Elan bu yazışmaya aid deyil');
      }
    }

    const created = await this.prisma.message.create({
      data: {
        senderId,
        recipientId: input.recipientId,
        listingId: input.listingId ?? null,
        body: input.body,
      },
    });

    return toDto(created, senderId);
  }

  /**
   * Söhbət siyahısı.
   *
   * Prisma `groupBy` ilə "hər cütlük üçün son mesaj" almaq mümkün deyil, ona
   * görə son mesajlar oxunur və yaddaşda qruplaşdırılır. Say məhduddur
   * (`THREAD_LIMIT`), yəni bu, böyümə üçün təhlükə yaratmır.
   */
  async threads(userId: string): Promise<MessageThreadDto[]> {
    const rows = await this.prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        recipient: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    const listingIds = [...new Set(rows.map((r) => r.listingId).filter(Boolean))] as string[];
    const listings = listingIds.length
      ? await this.prisma.listing.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, slug: true, property: { select: { title: true } } },
        })
      : [];
    const listingById = new Map(listings.map((l) => [l.id, l]));

    const threads = new Map<string, MessageThreadDto>();

    for (const row of rows) {
      const mine = row.senderId === userId;
      const partner = mine ? row.recipient : row.sender;
      const key = `${partner.id}:${row.listingId ?? ''}`;

      const existing = threads.get(key);
      if (existing) {
        // Sətirlər azalan sırada gəlir, ona görə birinci görülən sonuncudur.
        if (!mine && row.readAt === null) existing.unreadCount += 1;
        continue;
      }

      const listing = row.listingId ? listingById.get(row.listingId) : undefined;

      threads.set(key, {
        partner: {
          userId: partner.id,
          fullName: partner.fullName,
          avatarUrl: partner.avatarUrl,
        },
        listing: listing
          ? { id: listing.id, slug: listing.slug, title: listing.property.title }
          : null,
        lastMessage: {
          body: row.body,
          mine,
          createdAt: row.createdAt.toISOString(),
        },
        unreadCount: !mine && row.readAt === null ? 1 : 0,
      });
    }

    return [...threads.values()].slice(0, MessagesService.THREAD_LIMIT);
  }

  /** Bir söhbətin mesajları — köhnədən yeniyə. */
  async thread(
    userId: string,
    partnerId: string,
    listingId?: string,
  ): Promise<MessageThreadDetailDto> {
    const partner = await this.prisma.user.findFirst({
      where: { id: partnerId, deletedAt: null },
      select: { id: true, fullName: true, avatarUrl: true },
    });
    if (!partner) throw new NotFoundException('İstifadəçi tapılmadı');

    const rows = await this.prisma.message.findMany({
      where: {
        listingId: listingId ?? null,
        OR: [
          { senderId: userId, recipientId: partnerId },
          { senderId: partnerId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: MessagesService.PAGE_SIZE,
    });

    const listing = listingId
      ? await this.prisma.listing.findUnique({
          where: { id: listingId },
          select: { id: true, slug: true, property: { select: { title: true } } },
        })
      : null;

    return {
      partner: {
        userId: partner.id,
        fullName: partner.fullName,
        avatarUrl: partner.avatarUrl,
      },
      listing: listing
        ? { id: listing.id, slug: listing.slug, title: listing.property.title }
        : null,
      items: rows.map((r) => toDto(r, userId)),
    };
  }

  /** Söhbətdəki gələn mesajları oxunmuş sayır. */
  async markRead(userId: string, partnerId: string, listingId?: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: {
        recipientId: userId,
        senderId: partnerId,
        listingId: listingId ?? null,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({ where: { recipientId: userId, readAt: null } });
  }
}

function toDto(
  row: { id: string; body: string; senderId: string; readAt: Date | null; createdAt: Date },
  viewerId: string,
): MessageDto {
  return {
    id: row.id,
    body: row.body,
    mine: row.senderId === viewerId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
