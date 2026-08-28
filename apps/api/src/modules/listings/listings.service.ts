import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  LISTING,
  ListingStatus,
  RATE_LIMIT,
  slugify,
  type CityStatsDto,
  type DistrictStatsDto,
  type CreateListingInput,
  type ListingDetailDto,
  type ListingImageDto,
  type ListingSummaryDto,
  type Page,
  type ProximityDto,
  type ProximityMinutes,
  type UpdateListingInput,
  type UploadedImageDto,
} from '@yasayis/shared';
import { AnalyticsService } from '../analytics/analytics.service';
import { ImageService } from '../media/image.service';
import { ListingEventsService } from '../notifications/listing-events.service';
import { ListingsRepository, type ListingWithRelations } from './listings.repository';

/**
 * Elan yaratma və oxunuşu.
 *
 * Yaradılan elan dərhal `ACTIVE` olur — moderator təsdiqi gözlənilmir. Nəzarət
 * sonradandır: şikayət və admin paneli üzərindən elan dayandırıla və ya silinə
 * bilər (bax: `packages/shared/src/lifecycle.ts`).
 *
 * Şəkillər elan yaradıldıqdan sonra ayrıca yüklənir (hər fayl öz sorğusu ilə),
 * çünki 15 şəkli tək sorğuda göndərmək həm gec, həm də bir fayl xarab olanda
 * hamısını yenidən yükləməyi tələb edir. Şəkilsiz elan ictimai siyahıya
 * DÜŞMÜR — ona görə "aktiv" olmaq tək başına görünmək demək deyil.
 */
@Injectable()
export class ListingsService {
  constructor(
    private readonly repo: ListingsRepository,
    private readonly images: ImageService,
    // Əlaqə hadisələri ölçmə üçün toplanır, amma eyni qeyd gündəlik limitin
    // də sayğacıdır — ayrıca cədvəl saxlamağa ehtiyac yoxdur.
    private readonly contacts: AnalyticsService,
    private readonly events: ListingEventsService,
  ) {}

  // =========================================================================
  //  Yaratma
  // =========================================================================

  async create(ownerId: string, input: CreateListingInput): Promise<ListingDetailDto> {
    const { property, listing } = input;

    const created = await this.repo.createWithProperty(
      ownerId,
      {
        title: property.title,
        cityId: property.cityId,
        districtId: property.districtId ?? null,
        address: property.address ?? null,
        price: property.price,
        utilitiesIncluded: property.utilitiesIncluded,
        deposit: property.deposit ?? null,
        roomCount: property.roomCount,
        vacantRoomCount: property.vacantRoomCount,
        currentOccupantsCount: property.currentOccupantsCount,
        latitude: property.latitude ?? null,
        longitude: property.longitude ?? null,
      },
      {
        slug: await this.uniqueSlug(property.title),
        description: listing.description,
        suitableForStudents: listing.suitableForStudents,
        suitableForWomen: listing.suitableForWomen,
        suitableForMen: listing.suitableForMen,
        isMixed: listing.isMixed,
        petsAllowed: listing.petsAllowed,
        smokingRule: listing.smokingRule,
        guestRules: listing.guestRules,
        amenities: listing.amenities,
        // Moderasiya gözlənilmədiyi üçün dərc tarixi elə indidir.
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + LISTING.EXPIRY_DAYS * 86_400_000),
      },
      property.nearbyUniversities,
    );

    return toDetailDto(created, { isOwner: true, isAuthenticated: true });
  }

  /**
   * Elanın redaktəsi.
   *
   * Bu endpoint əvvəl YOX idi və bu, açıq ziddiyyət yaradırdı: rədd edilmiş
   * elanın izahı istifadəçiyə "səbəbi oxuyub düzəliş edin və yenidən göndərin"
   * deyirdi, amma düzəliş etməyin heç bir yolu yox idi — yeganə çıxış elanı
   * sıfırdan yenidən yaratmaq idi (şəkillər də daxil).
   *
   * Redaktədən sonra elan statusunu DƏYİŞMİR: moderasiya sonradan olduğu üçün
   * aktiv elanı yenidən növbəyə salmağa ehtiyac yoxdur.
   *
   * Qiymət dəyişikliyi və məzmun yeniləməsi elanı saxlayanlara bildiriş
   * göndərir — `ListingEventsService` bunun üçün yazılmışdı, amma onu çağıran
   * heç kim yox idi.
   */
  async update(
    listingId: string,
    ownerId: string,
    input: UpdateListingInput,
  ): Promise<ListingDetailDto> {
    const current = await this.requireOwned(listingId, ownerId);

    if (current.status === ListingStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Dayandırılmış elan redaktə edilə bilməz. Dəstəklə əlaqə saxlayın.',
      );
    }

    const { property, listing } = input;
    const oldPrice = current.property.price;
    const newPrice = property?.price ?? oldPrice;

    // Başlıq dəyişəndə slug OLDUĞU KİMİ QALIR: paylaşılmış link, indekslənmiş
    // səhifə və favorit hamısı slug üzərindən işləyir, onu dəyişmək canlı
    // linkləri qırardı.
    const updated = await this.repo.updateWithProperty(
      listingId,
      current.propertyId,
      {
        ...(property?.title !== undefined ? { title: property.title } : {}),
        ...(property?.cityId !== undefined ? { cityId: property.cityId } : {}),
        ...(property?.districtId !== undefined
          ? { districtId: property.districtId ?? null }
          : {}),
        ...(property?.address !== undefined ? { address: property.address ?? null } : {}),
        ...(property?.price !== undefined ? { price: property.price } : {}),
        ...(property?.utilitiesIncluded !== undefined
          ? { utilitiesIncluded: property.utilitiesIncluded }
          : {}),
        ...(property?.deposit !== undefined ? { deposit: property.deposit ?? null } : {}),
        ...(property?.roomCount !== undefined ? { roomCount: property.roomCount } : {}),
        ...(property?.vacantRoomCount !== undefined
          ? { vacantRoomCount: property.vacantRoomCount }
          : {}),
        ...(property?.currentOccupantsCount !== undefined
          ? { currentOccupantsCount: property.currentOccupantsCount }
          : {}),
        ...(property?.latitude !== undefined ? { latitude: property.latitude ?? null } : {}),
        ...(property?.longitude !== undefined
          ? { longitude: property.longitude ?? null }
          : {}),
      },
      {
        ...(listing?.description !== undefined ? { description: listing.description } : {}),
        ...(listing?.suitableForStudents !== undefined
          ? { suitableForStudents: listing.suitableForStudents }
          : {}),
        ...(listing?.suitableForWomen !== undefined
          ? { suitableForWomen: listing.suitableForWomen }
          : {}),
        ...(listing?.suitableForMen !== undefined
          ? { suitableForMen: listing.suitableForMen }
          : {}),
        ...(listing?.isMixed !== undefined ? { isMixed: listing.isMixed } : {}),
        ...(listing?.petsAllowed !== undefined ? { petsAllowed: listing.petsAllowed } : {}),
        ...(listing?.smokingRule !== undefined ? { smokingRule: listing.smokingRule } : {}),
        ...(listing?.guestRules !== undefined ? { guestRules: listing.guestRules } : {}),
        ...(listing?.amenities !== undefined ? { amenities: listing.amenities } : {}),
        /*
          Redaktədən sonra elan AKTİV QALIR.

          Əvvəl aktiv elan məzmun dəyişəndə `PENDING`-ə qaytarılırdı, çünki
          moderasiya öncədən idi. İndi moderasiya sonradandır: elanı yenidən
          növbəyə salmaq onu səbəbsiz yerə axtarışdan çıxarardı — qiyməti
          düzəltmək istəyən ev sahibi elanını bir günlük itirərdi.
        */
      },
      property?.nearbyUniversities,
    );

    // Bildirişlər "unut və davam et": uğursuzluq redaktəni geri qaytarmır.
    void this.events.onPriceChanged(listingId, oldPrice, newPrice).catch(() => undefined);
    void this.events.onListingUpdated(listingId).catch(() => undefined);

    return toDetailDto(updated, { isOwner: true, isAuthenticated: true });
  }

  /** Başlıqdan SEO slug: "Yasamalda 2 otaqlı" → "yasamalda-2-otaqli-a7f3" */
  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'elan';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${base}-${randomBytes(2).toString('hex')}`;
      if ((await this.repo.slugExists(candidate)) === 0) return candidate;
    }
    return `${base}-${randomBytes(6).toString('hex')}`;
  }

  // =========================================================================
  //  Oxuma
  // =========================================================================

  async getBySlug(slug: string, viewerId?: string): Promise<ListingDetailDto> {
    const listing = await this.repo.findBySlug(slug);
    if (!listing || listing.property.deletedAt) {
      throw new NotFoundException('Elan tapılmadı');
    }

    const isOwner = viewerId === listing.property.ownerId;

    // Moderasiyadan keçməmiş elanı yalnız sahibi görə bilər.
    if (listing.status !== 'ACTIVE' && !isOwner) {
      throw new NotFoundException('Elan tapılmadı');
    }

    if (!isOwner) await this.repo.incrementViews(listing.id).catch(() => undefined);

    // Telefon nömrəsi giriş etmiş istifadəçiyə açılır (Prompt F2): MVP-də
    // daxili chat yoxdur, əlaqə birbaşa zəng və ya WhatsApp ilə qurulur.
    // Qonağa göstərmək nömrələri robot yığımına açıq qoyardı.
    return toDetailDto(listing, { isOwner, isAuthenticated: Boolean(viewerId) });
  }

  /**
   * Ev sahibinin nömrəsini açır və hadisəni qeydə alır.
   *
   * Gündəlik limit anti-scraping tədbiridir: real tələbə günə bir neçə elanla
   * əlaqə saxlayır, robot isə yüzlərlə. Limit `RATE_LIMIT.CONTACT_REQUEST`-dən
   * gəlir və eyni elana təkrar baxış SAYILMIR — istifadəçi səhifəni yenidən
   * açanda cəzalandırılmamalıdır.
   */
  async revealContact(
    listingId: string,
    viewerId: string,
  ): Promise<{ phone: string | null }> {
    const listing = await this.repo.findById(listingId);

    if (!listing || listing.property.deletedAt || listing.status !== 'ACTIVE') {
      throw new NotFoundException('Elan tapılmadı');
    }

    const ownerId = listing.property.ownerId;

    // Sahibi öz elanına baxır — limit də, qeyd də lazım deyil.
    if (ownerId === viewerId) {
      return { phone: listing.property.owner.phone };
    }

    const alreadyContacted = await this.contacts.hasContacted(viewerId, ownerId, listingId);

    if (!alreadyContacted) {
      const used = await this.contacts.countSince(
        viewerId,
        new Date(Date.now() - RATE_LIMIT.CONTACT_REQUEST.ttlSec * 1000),
      );

      if (used >= RATE_LIMIT.CONTACT_REQUEST.limit) {
        throw new HttpException(
          `Gündə ən çox ${RATE_LIMIT.CONTACT_REQUEST.limit} elanla əlaqə saxlaya bilərsiniz. Sabah yenidən cəhd edin.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.contacts.recordContact(viewerId, {
        targetUserId: ownerId,
        listingId,
        channel: 'PHONE_REVEAL',
      });
    }

    return { phone: listing.property.owner.phone };
  }

  async list(args: { cityId?: string; limit: number; cursor?: string }): Promise<
    Page<ListingSummaryDto>
  > {
    const rows = await this.repo.findActive({
      cityId: args.cityId,
      take: args.limit,
      cursor: args.cursor,
    });

    const hasMore = rows.length > args.limit;
    const page = hasMore ? rows.slice(0, args.limit) : rows;

    return {
      items: page.map((l) => toSummaryDto(l)),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Şəhərlər + aktiv elan sayı.
   * Sıra taksonomiyadakı `sortOrder`-dən gəlir — "populyar" seçimi məhsul
   * qərarıdır və admin panelindən idarə olunur, kodda sabitlənmir.
   */
  async cityStats(): Promise<CityStatsDto[]> {
    const [cities, counts] = await Promise.all([
      this.repo.findActiveCities(),
      this.repo.countActiveByCity(),
    ]);

    const map = new Map(counts.map((c) => [c.cityId, c.count]));

    return cities.map((c) => ({
      cityId: c.id,
      slug: c.slug,
      name: c.name,
      activeListings: map.get(c.id) ?? 0,
    }));
  }

  /**
   * Rayon kartları. Qiymət aralığı yalnız aktiv elan olanda doldurulur —
   * boş rayonda `priceMin/Max` null qalır və UI yalnız adı göstərir.
   */
  async districtStats(citySlug?: string): Promise<DistrictStatsDto[]> {
    const [districts, stats] = await Promise.all([
      this.repo.findActiveDistricts(citySlug),
      this.repo.statsActiveByDistrict(),
    ]);

    const map = new Map(stats.map((s) => [s.districtId, s]));

    return districts.map((d) => {
      const stat = map.get(d.id);
      return {
        districtId: d.id,
        slug: d.slug,
        name: d.name,
        citySlug: d.city.slug,
        cityName: d.city.name,
        activeListings: stat?.count ?? 0,
        priceMin: stat?.min ?? null,
        priceMax: stat?.max ?? null,
      };
    });
  }

  // =========================================================================
  //  Şəkillər
  // =========================================================================

  async addImage(
    listingId: string,
    ownerId: string,
    file: Express.Multer.File,
  ): Promise<UploadedImageDto> {
    const listing = await this.requireOwned(listingId, ownerId);
    const propertyId = listing.propertyId;

    const count = await this.repo.countImages(propertyId);
    if (count >= LISTING.IMAGES_MAX) {
      throw new BadRequestException(
        `Ən çox ${LISTING.IMAGES_MAX} şəkil yükləyə bilərsiniz`,
      );
    }

    const processed = await this.images.process(file, `properties/${propertyId}`);

    const saved = await this.repo.createImage({
      propertyId,
      url: processed.url,
      thumbUrl: processed.thumbUrl,
      storagePath: processed.path,
      width: processed.width,
      height: processed.height,
      sizeBytes: processed.sizeBytes,
      sortOrder: count,
      // İlk yüklənən şəkil avtomatik cover olur.
      isCover: count === 0,
    });

    /*
      Saxlanmış axtarışlara bildiriş məhz BURADA göndərilir, elan yaradılanda yox.

      Səbəb: şəkilsiz elan ictimai siyahılarda görünmür (`images: { some: {} }`).
      Yaradılış anında bildiriş göndərsəydik, istifadəçi "yeni uyğun elan" xəbəri
      alıb keçid edəndə boş nəticə görərdi. İlk şəkil yüklənən an isə elanın
      həqiqətən görünən olduğu andır.

      Əvvəl bu çağırış moderasiya qərarında (`lifecycle.moderate`) idi; moderasiya
      aradan qalxdığı üçün onu buraya köçürmək lazım gəldi — yoxsa saxlanmış
      axtarışlar bir daha heç vaxt işə düşməzdi.

      "Unut və davam et": bildiriş uğursuz olsa da şəkil yüklənmiş qalır.
    */
    if (count === 0 && listing.status === ListingStatus.ACTIVE) {
      void this.events.onListingActivated(listingId).catch(() => undefined);
    }

    return {
      id: saved.id,
      url: saved.url,
      thumbUrl: saved.thumbUrl,
      width: saved.width ?? processed.width,
      height: saved.height ?? processed.height,
      sizeBytes: saved.sizeBytes ?? processed.sizeBytes,
    };
  }

  /** Sıralamanı dəyişir; yeni birinci şəkil avtomatik cover olur. */
  async reorderImages(
    listingId: string,
    ownerId: string,
    imageIds: string[],
  ): Promise<ListingImageDto[]> {
    const listing = await this.requireOwned(listingId, ownerId);
    const current = await this.repo.findImages(listing.propertyId);

    const known = new Set(current.map((i) => i.id));
    if (imageIds.length !== current.length || imageIds.some((id) => !known.has(id))) {
      throw new BadRequestException('Şəkil siyahısı uyğun gəlmir');
    }

    const rows = await this.repo.reorderImages(listing.propertyId, imageIds);
    return rows.map(toImageDto);
  }

  async removeImage(listingId: string, ownerId: string, imageId: string): Promise<void> {
    const listing = await this.requireOwned(listingId, ownerId);
    const image = await this.repo.findImage(imageId);

    if (!image || image.propertyId !== listing.propertyId) {
      throw new NotFoundException('Şəkil tapılmadı');
    }

    await this.repo.deleteImage(imageId);
    if (image.storagePath) await this.images.remove(image.storagePath);

    // Cover silinibsə, qalanların birincisi cover olur — elan cover-siz qalmır.
    const rest = await this.repo.findImages(listing.propertyId);
    if (rest.length > 0 && !rest.some((i) => i.isCover)) {
      await this.repo.reorderImages(
        listing.propertyId,
        rest.map((i) => i.id),
      );
    }
  }

  // =========================================================================

  private async requireOwned(
    listingId: string,
    ownerId: string,
  ): Promise<ListingWithRelations> {
    const listing = await this.repo.findById(listingId);
    if (!listing || listing.property.deletedAt) {
      throw new NotFoundException('Elan tapılmadı');
    }
    if (listing.property.ownerId !== ownerId) {
      throw new ForbiddenException('Bu elan sizə aid deyil');
    }
    return listing;
  }
}

// ---------------------------------------------------------------------------
// Çevirmələr
// ---------------------------------------------------------------------------

function toImageDto(i: {
  id: string;
  url: string;
  thumbUrl: string | null;
  isCover: boolean;
  sortOrder: number;
}): ListingImageDto {
  return {
    id: i.id,
    url: i.url,
    thumbUrl: i.thumbUrl,
    isCover: i.isCover,
    sortOrder: i.sortOrder,
  };
}

function toProximity(p: {
  minutes: number;
  university: { id: string; name: string; shortName: string | null };
}): ProximityDto {
  return {
    universityId: p.university.id,
    universityName: p.university.name,
    universityShortName: p.university.shortName,
    minutes: p.minutes as ProximityMinutes,
  };
}

export function toSummaryDto(l: ListingWithRelations): ListingSummaryDto {
  const p = l.property;
  const cover = p.images.find((i) => i.isCover) ?? p.images[0] ?? null;
  const nearest = p.nearbyUniversities[0] ?? null;

  return {
    id: l.id,
    slug: l.slug,
    title: p.title,
    status: l.status,
    cityName: p.city.name,
    districtName: p.district?.name ?? null,
    price: p.price,
    utilitiesIncluded: p.utilitiesIncluded,
    roomCount: p.roomCount,
    vacantRoomCount: p.vacantRoomCount,
    coverImageUrl: cover?.thumbUrl ?? cover?.url ?? null,
    suitableForStudents: l.suitableForStudents,
    amenities: l.amenities,
    nearestUniversity: nearest ? toProximity(nearest) : null,
    publishedAt: l.publishedAt?.toISOString() ?? null,
  };
}

/**
 * Koordinatların məxfilik emalı.
 *
 * Dəqiq nöqtə `address` kimi YALNIZ sahibinə qaytarılır. Başqalarına
 * sürüşdürülmüş və yuvarlaqlaşdırılmış nöqtə gedir — client onun ətrafında
 * dairə çəkir.
 *
 * NİYƏ SERVERDƏ, CLIENT-DƏ YOX
 * Bulanıqlaşdırma əvvəl yalnız brauzerdə aparılırdı: xəritədə dairə görünürdü,
 * amma dəqiq koordinat API cavabının içində hər kəsə gedirdi və şəbəkə
 * panelindən oxuna bilirdi. Yəni müdafiə görüntüdən ibarət idi.
 *
 * Sürüşdürmə elanın id-sindən hesablanır və SABİTDİR: hər sorğuda təsadüfi
 * olsaydı, bir neçə cavabı toplayıb ortalamaqla real nöqtəni tapmaq olardı.
 */
const PRIVACY_OFFSET_M = 220;

function blurredCoords(
  latitude: number | null,
  longitude: number | null,
  seed: string,
  isOwner: boolean,
): { latitude: number | null; longitude: number | null } {
  if (latitude === null || longitude === null) {
    return { latitude: null, longitude: null };
  }
  if (isOwner) return { latitude, longitude };

  let hash = 7;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const angle = (Math.abs(hash % 10_000) / 10_000) * 2 * Math.PI;

  const dLat = (PRIVACY_OFFSET_M * Math.cos(angle)) / 111_320;
  const dLng =
    (PRIVACY_OFFSET_M * Math.sin(angle)) /
    (111_320 * Math.cos((latitude * Math.PI) / 180) || 1);

  // Üç onluq rəqəm ≈ 110 m — sürüşdürmədən sonra əlavə dəqiqlik itkisi.
  return {
    latitude: Number((latitude + dLat).toFixed(3)),
    longitude: Number((longitude + dLng).toFixed(3)),
  };
}

export function toDetailDto(
  l: ListingWithRelations,
  opts: { isOwner: boolean; isAuthenticated: boolean },
): ListingDetailDto {
  const p = l.property;
  const owner = p.owner;

  return {
    ...toSummaryDto(l),
    // Detal səhifəsində qalereya tam ölçülü şəkillərdən ibarətdir.
    coverImageUrl: p.images.find((i) => i.isCover)?.url ?? p.images[0]?.url ?? null,
    // Redaktə forması `<select>`-ləri id ilə doldurur.
    cityId: p.cityId,
    districtId: p.districtId,
    description: l.description,
    // Dəqiq ünvan yalnız sahibinə görünür — ictimai səhifədə rayon kifayətdir.
    address: opts.isOwner ? p.address : null,
    deposit: p.deposit,
    currentOccupantsCount: p.currentOccupantsCount,
    suitableForWomen: l.suitableForWomen,
    suitableForMen: l.suitableForMen,
    isMixed: l.isMixed,
    petsAllowed: l.petsAllowed,
    smokingRule: l.smokingRule,
    guestRules: l.guestRules,
    // Dəqiq nöqtə YALNIZ sahibinə gedir — `address` ilə eyni qayda.
    ...blurredCoords(p.latitude, p.longitude, l.id, opts.isOwner),
    nearbyUniversities: p.nearbyUniversities.map(toProximity),
    images: p.images.map(toImageDto),
    viewCount: l.viewCount,
    owner: {
      id: owner.id,
      fullName: owner.fullName,
      avatarUrl: owner.avatarUrl,
      isCompany: owner.ownerProfile?.isCompany ?? false,
      companyName: owner.ownerProfile?.companyName ?? null,
      phoneVerified: owner.phoneVerifiedAt !== null,
      // Yalnız "var/yox" — nömrənin özü aşağıda, ayrıca qaydaya tabedir.
      hasPhone: owner.phone !== null,
      ownerVerified: owner.ownerProfile?.verificationStatus === 'VERIFIED',
      memberSince: owner.createdAt.toISOString(),
      /*
        Nömrə YALNIZ sahibinin özünə qaytarılır.

        Əvvəl istənilən giriş etmiş istifadəçi onu bu cavabda alırdı və
        "Əlaqə saxla" düyməsi sadəcə görüntü idi — nömrə onsuz da səhifənin
        JSON-unda gəlirdi. Bir hesab açıb bütün elanları gəzmək kifayət edirdi
        ki, bazadakı hər ev sahibinin nömrəsi yığılsın; heç bir iz də qalmırdı.

        İndi nömrə ayrıca `POST /listings/:id/contact` çağırışı ilə açılır:
        gündəlik limit tətbiq olunur və hər açılış `ContactEvent` kimi qeydə
        düşür. İstifadəçi üçün davranış dəyişmir — düyməyə basır, nömrəni görür.
      */
      phone: opts.isOwner ? owner.phone : null,
    },
  };
}
