<?php

namespace App\Services\Promotion;

use App\Models\Promotion\Promotion;
use App\Models\User;
use App\Notifications\PromotionPublishedNotification;
use App\Services\Security\PromotionContentSanitizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PromotionService
{
    private const MAX_IMAGES = 3;

    private const PROMOTION_RELATIONS = [
        'images',
        'actions',
        'embeds',
        'author',
        'customers',
        'survey',
    ];

    public function __construct(
        private readonly PromotionContentSanitizer $contentSanitizer,
    ) {}

    public function list(array $filters): array
    {
        $query = Promotion::query()->with(self::PROMOTION_RELATIONS);
        $user = request()->user();

        if ($user?->hasRole('customer')) {
            $query->where(function ($builder) use ($user) {
                $builder->where('audience_type', 'all')
                    ->orWhereHas('customers', fn ($customers) => $customers
                        ->whereKey($user->customer_id));
            });
        }

        if (! empty($filters['active_only'])) {
            $now = Carbon::now();

            $query->where('status', 'published')
                ->where(function ($builder) use ($now) {
                    $builder->whereNull('published_at')
                        ->orWhere('published_at', '<=', $now);
                })
                ->where(function ($builder) use ($now) {
                    $builder->whereNull('starts_at')
                        ->orWhere('starts_at', '<=', $now);
                })
                ->where(function ($builder) use ($now) {
                    $builder->whereNull('ends_at')
                        ->orWhere('ends_at', '>=', $now);
                });
        }

        if (! empty($filters['q'])) {
            $search = $filters['q'];
            $query->where(fn ($builder) => $builder
                ->where('title', 'like', "%{$search}%")
                ->orWhere('summary', 'like', "%{$search}%"));
        }

        if (in_array($filters['type_post'] ?? null, ['promotion', 'news', 'survey'], true)) {
            $query->where('type_post', $filters['type_post']);
        }

        $perPage = min(max((int) ($filters['itemsPerPage'] ?? 10), 1), 100);
        $paginator = $query->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        return [
            'promotions' => $paginator,
            'totalPromotions' => $paginator->total(),
            'per_page' => $paginator->perPage(),
            'current_page' => $paginator->currentPage(),
        ];
    }

    public function create(array $data): Promotion
    {
        $data['content'] = $this->contentSanitizer->sanitize($data['content']);
        $storedPaths = [];

        try {
            $promotion = DB::transaction(function () use ($data, &$storedPaths) {
                if (($data['status'] ?? null) === 'published' && empty($data['published_at'])) {
                    $data['published_at'] = Carbon::now();
                }

                $images = $data['images'] ?? [];
                $altTexts = $data['image_alt_texts'] ?? [];
                $attachments = $data['attachments'] ?? [];
                $actions = $data['actions'] ?? [];
                $embeds = $data['embeds'] ?? [];
                $customerIds = $data['customer_ids'] ?? [];
                unset($data['images'], $data['image_alt_texts'], $data['attachments'], $data['customer_ids']);

                $promotion = Promotion::create($data);
                $promotion->customers()->sync($data['audience_type'] === 'selected' ? $customerIds : []);
                $storedPaths = [
                    ...$this->storeImages($promotion, $images, $altTexts),
                    ...$this->storeAttachments($promotion, $attachments),
                ];
                $this->syncActionsAndEmbeds($promotion, $actions, $embeds);

                return $this->loadPromotion($promotion);
            });
        } catch (\Throwable $exception) {
            foreach ($storedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        if ($promotion->status === 'published') {
            $this->notifyEligibleCustomers($promotion);
        }

        return $promotion;
    }

    public function update(Promotion $promotion, array $data): Promotion
    {
        if (array_key_exists('content', $data)) {
            $data['content'] = $this->contentSanitizer->sanitize($data['content']);
        }

        $storedPaths = [];
        $wasPublished = $promotion->status === 'published';

        try {
            $updatedPromotion = DB::transaction(function () use ($promotion, $data, $wasPublished, &$storedPaths) {
                $images = $data['images'] ?? [];
                $altTexts = $data['image_alt_texts'] ?? [];
                $attachments = $data['attachments'] ?? [];
                $actions = $data['actions'] ?? null;
                $embeds = $data['embeds'] ?? null;
                $deletedImageIds = $data['deleted_image_ids'] ?? [];
                $deletedAttachmentIds = $data['deleted_attachment_ids'] ?? [];
                $customerIds = $data['customer_ids'] ?? [];
                $audienceType = $data['audience_type'] ?? null;
                unset(
                    $data['images'],
                    $data['image_alt_texts'],
                    $data['attachments'],
                    $data['deleted_image_ids'],
                    $data['deleted_attachment_ids'],
                    $data['actions'],
                    $data['embeds'],
                    $data['embeds_present'],
                    $data['customer_ids'],
                );

                if (! $wasPublished && ($data['status'] ?? null) === 'published' && empty($data['published_at'])) {
                    $data['published_at'] = Carbon::now();
                }

                $promotion->update($data);
                if ($audienceType !== null) {
                    $promotion->customers()->sync(
                        $audienceType === 'selected' ? $customerIds : []
                    );
                }

                if ($deletedImageIds !== []) {
                    $imagesToDelete = $promotion->images()
                        ->whereIn('id', $deletedImageIds)
                        ->get();

                    foreach ($imagesToDelete as $image) {
                        Storage::disk('public')->delete($image->path);
                        $image->delete();
                    }
                }

                if ($images !== []) {
                    $currentCount = $promotion->images()->count();
                    if ($currentCount + count($images) > self::MAX_IMAGES) {
                        abort(422, 'Una publicación no puede superar 3 imágenes.');
                    }
                }

                if ($deletedAttachmentIds !== []) {
                    $attachmentsToDelete = $promotion->attachments()
                        ->whereIn('id', $deletedAttachmentIds)
                        ->get();

                    foreach ($attachmentsToDelete as $attachment) {
                        Storage::disk('public')->delete($attachment->path);
                        $attachment->delete();
                    }
                }

                if ($attachments !== []) {
                    $storedPaths = [
                        ...$storedPaths,
                        ...$this->storeAttachments($promotion, $attachments),
                    ];
                }

                if ($images !== []) {
                    $storedPaths = $this->storeImages($promotion, $images, $altTexts);
                }

                if ($actions !== null) {
                    $promotion->actions()->delete();
                    $promotion->actions()->createMany($actions);
                }

                if ($embeds !== null) {
                    $promotion->embeds()->delete();
                    $promotion->embeds()->createMany($embeds);
                }

                return $this->loadPromotion($promotion);
            });

            if (! $wasPublished && $updatedPromotion->status === 'published') {
                $this->notifyEligibleCustomers($updatedPromotion);
            }

            return $updatedPromotion;
        } catch (\Throwable $exception) {
            foreach ($storedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }
    }

    private function notifyEligibleCustomers(Promotion $promotion): void
    {
        $customerIds = $promotion->audience_type === 'all'
            ? User::query()
                ->where('is_active', true)
                ->whereNotNull('customer_id')
                ->pluck('customer_id')
            : $promotion->customers()->pluck('customer_customers.id');

        User::query()
            ->where('is_active', true)
            ->whereIn('customer_id', $customerIds)
            ->each(fn (User $user) => $user->notify(
                new PromotionPublishedNotification($promotion)
            ));
    }

    public function archive(Promotion $promotion): Promotion
    {
        $promotion->update(['status' => 'archived']);

        return $this->loadPromotion($promotion);
    }

    private function loadPromotion(Promotion $promotion): Promotion
    {
        return $promotion->load(self::PROMOTION_RELATIONS);
    }

    /**
     * @param  array<int, UploadedFile>  $files
     * @param  array<int, string|null>  $altTexts
     * @return array<int, string>
     */
    private function storeImages(Promotion $promotion, array $files, array $altTexts): array
    {
        $storedPaths = [];
        $nextOrder = (int) $promotion->images()->max('sort_order') + 1;

        try {
            foreach ($files as $index => $file) {
                $path = $file->store('promotions/'.$promotion->id, 'public');
                $storedPaths[] = $path;

                $promotion->images()->create([
                    'path' => $path,
                    'alt_text' => $altTexts[$index] ?? null,
                    'sort_order' => $nextOrder++,
                    'is_active' => true,
                ]);
            }
        } catch (\Throwable $exception) {
            foreach ($storedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        return $storedPaths;
    }

    /**
     * @param  array<int, array<string, mixed>>  $actions
     * @param  array<int, array<string, mixed>>  $embeds
     */
    private function syncActionsAndEmbeds(
        Promotion $promotion,
        array $actions,
        array $embeds,
    ): void {
        $promotion->actions()->delete();
        $promotion->embeds()->delete();

        $promotion->actions()->createMany($actions);
        $promotion->embeds()->createMany($embeds);
    }

    /**
     * @param  array<int, UploadedFile>  $files
     */
    private function storeAttachments(Promotion $promotion, array $files): array
    {
        $storedPaths = [];
        $nextOrder = (int) $promotion->attachments()->max('sort_order') + 1;

        try {
            foreach ($files as $file) {
                $path = $file->store('promotions/'.$promotion->id.'/attachments', 'public');
                $storedPaths[] = $path;

                $promotion->attachments()->create([
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'sort_order' => $nextOrder++,
                ]);
            }
        } catch (\Throwable $exception) {
            foreach ($storedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        return $storedPaths;
    }
}
