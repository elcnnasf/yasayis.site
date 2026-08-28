import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  Ability,
  createListingSchema,
  expireListingSchema,
  LISTING,
  listingImageOrderSchema,
  moderateListingSchema,
  RATE_LIMIT,
  searchListingsQuerySchema,
  updateListingSchema,
} from '@yasayis/shared';
import { ZodValidationPipe, zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, OptionalAuth, Public, RequireAbility } from '../auth/decorators';
import { ListingLifecycleService } from './listing-lifecycle.service';
import { ListingSearchService } from './listing-search.service';
import { ListingsService } from './listings.service';

/**
 * Elanlar.
 *
 * Yaratma və şəkil yükləmə `LISTING_CREATE` icazəsi tələb edir — bu icazə
 * `isOwner` bayrağı ilə gəlir. Tələbə eyni anda ev sahibi ola bildiyi üçün
 * yoxlama rol adı ilə deyil, icazə ilə aparılır.
 */
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly search: ListingSearchService,
    private readonly lifecycle: ListingLifecycleService,
  ) {}

  /**
   * Axtarış və filtrlər.
   * Yalnız `ACTIVE` və ən azı bir şəkli olan elanlar qaytarılır.
   */
  @OptionalAuth()
  @Get()
  list(
    @Query(new ZodValidationPipe(searchListingsQuerySchema))
    query: Parameters<ListingSearchService['search']>[0],
    @CurrentUser() actor?: AuthUser,
  ) {
    return this.search.search(query, actor?.id);
  }

  /**
   * Redaktə.
   *
   * `:slug` marşrutundan ƏVVƏL dayanmalı deyil (o, `@Get`-dir), amma
   * `:id/images` PATCH-i ilə qarışmasın deyə burada, həyat dövründən əvvəl
   * saxlanılır.
   */
  @RequireAbility(Ability.LISTING_MANAGE_OWN)
  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(updateListingSchema)) dto: unknown,
  ) {
    return this.listings.update(id, actor.id, dto as never);
  }

  // --- Həyat dövrü ---------------------------------------------------------

  /** "Elan artıq aktual deyil" — sahibi özü bağlayır. */
  @RequireAbility(Ability.LISTING_MANAGE_OWN)
  @Post(':id/expire')
  @HttpCode(HttpStatus.OK)
  expire(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(expireListingSchema)) dto: unknown,
  ) {
    return this.lifecycle.expireByOwner(id, actor.id, dto as never);
  }

  /** Müddəti bitmiş və ya rədd edilmiş elanı yenidən yoxlamaya göndərir. */
  @RequireAbility(Ability.LISTING_MANAGE_OWN)
  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  renew(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.lifecycle.renewByOwner(id, actor.id);
  }

  /** Moderasiya qərarı (Prompt G2 admin panelini bunun üzərində quracaq). */
  @RequireAbility(Ability.LISTING_MODERATE)
  @Post(':id/moderate')
  @HttpCode(HttpStatus.OK)
  moderate(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(moderateListingSchema)) dto: unknown,
  ) {
    return this.lifecycle.moderate(id, actor.id, dto as never);
  }

  /** Şəhər kartları üçün: şəhər siyahısı + aktiv elan sayı. */
  @Public()
  @Get('city-stats')
  cityStats() {
    return this.listings.cityStats();
  }

  /** Rayon kartları üçün: rayon siyahısı + aktiv elan sayı + qiymət aralığı. */
  @Public()
  @Get('district-stats')
  districtStats(@Query('citySlug') citySlug?: string) {
    return this.listings.districtStats(citySlug);
  }

  /** Detal səhifəsi. Sahibi öz elanını moderasiyadan əvvəl də görə bilir. */
  @OptionalAuth()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string, @CurrentUser() actor?: AuthUser) {
    return this.listings.getBySlug(slug, actor?.id);
  }

  /** Yaradılan elan avtomatik `PENDING` olur. */
  @RequireAbility(Ability.LISTING_CREATE)
  @Post()
  @Throttle({
    default: {
      limit: RATE_LIMIT.LISTING_CREATE.limit,
      ttl: RATE_LIMIT.LISTING_CREATE.ttlSec * 1000,
    },
  })
  create(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(createListingSchema)) dto: unknown,
  ) {
    return this.listings.create(actor.id, dto as never);
  }

  /**
   * Ev sahibinin nömrəsini açır.
   *
   * Nömrə elan cavabında QAYTARILMIR — yalnız burada. Səbəb `toDetailDto`
   * şərhində yazılıb: cavabın içində gedən nömrə heç bir iz qoymadan
   * kütləvi yığıla bilirdi.
   *
   * `@Throttle` şəbəkə səviyyəsində qısa müddətli sel-hücumu dayandırır;
   * gündəlik limit isə servisdə, `ContactEvent` qeydləri üzərində sayılır —
   * o, IP dəyişməklə keçilə bilmir, çünki hesaba bağlıdır.
   */
  @RequireAbility(Ability.CONTACT_VIEW_PHONE)
  @Post(':id/contact')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  revealContact(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.listings.revealContact(id, actor.id);
  }

  // --- Şəkillər ------------------------------------------------------------

  /**
   * Bir şəkil yükləyir. Hər fayl ayrıca sorğu ilə gedir ki, istifadəçi
   * irəliləyişi görsün və bir fayl xarab olanda hamısı yenidən yüklənməsin.
   */
  @RequireAbility(Ability.LISTING_MANAGE_OWN)
  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: LISTING.IMAGE_MAX_BYTES, files: 1 },
    }),
  )
  addImage(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.listings.addImage(id, actor.id, file);
  }

  /** Sıralamanı dəyişir — birinci şəkil avtomatik cover olur. */
  @RequireAbility(Ability.LISTING_MANAGE_OWN)
  @Patch(':id/images')
  reorderImages(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(listingImageOrderSchema)) dto: unknown,
  ) {
    return this.listings.reorderImages(
      id,
      actor.id,
      (dto as { imageIds: string[] }).imageIds,
    );
  }

  @RequireAbility(Ability.LISTING_MANAGE_OWN)
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.listings.removeImage(id, actor.id, imageId);
  }
}
