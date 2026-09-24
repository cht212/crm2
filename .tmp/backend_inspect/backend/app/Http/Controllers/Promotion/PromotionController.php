<?php

namespace App\Http\Controllers\Promotion;

use App\Http\Controllers\Controller;
use App\Http\Requests\Promotion\StorePromotionRequest;
use App\Http\Requests\Promotion\UpdatePromotionRequest;
use App\Http\Resources\Promotion\PromotionListResource;
use App\Http\Resources\Promotion\PromotionResource;
use App\Models\Promotion\Promotion;
use App\Services\Promotion\PromotionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PromotionController extends Controller
{
    public function __construct(
        protected PromotionService $promotionService,
    ) {}

    public function index(Request $request)
    {
        Gate::forUser($request->user())->authorize('viewAny', Promotion::class);

        $filters = $request->all();
        if ($request->user()->hasRole('customer')) {
            $filters['active_only'] = true;
        }

        $listData = $this->promotionService->list($filters);

        return response()->json([
            'promotions' => PromotionListResource::collection($listData['promotions']),
            'totalPromotions' => $listData['totalPromotions'],
            'per_page' => $listData['per_page'],
            'current_page' => $listData['current_page'],
        ]);
    }

    public function store(StorePromotionRequest $request)
    {
        Gate::forUser($request->user())->authorize('create', Promotion::class);

        $data = $request->validated();
        $data['author_id'] = $request->user()->getKey();

        return response()->json([
            'message' => 'Promoción registrada correctamente.',
            'promotion' => new PromotionResource(
                $this->promotionService->create($data)
            ),
        ], 201);
    }

    public function show(Promotion $promotion)
    {
        Gate::forUser(request()->user())->authorize('view', $promotion);

        return response()->json([
            'promotion' => new PromotionResource(
                $promotion->load(
                    'images',
                    'attachments',
                    'actions',
                    'embeds',
                    'author',
                    'customers',
                    'survey.questions.options',
                )
            ),
        ]);
    }

    public function update(UpdatePromotionRequest $request, Promotion $promotion)
    {
        Gate::forUser($request->user())->authorize('update', $promotion);

        return response()->json([
            'message' => 'Promoción actualizada correctamente.',
            'promotion' => new PromotionResource(
                $this->promotionService->update($promotion, $request->validated())
            ),
        ]);
    }

    public function archive(Request $request, Promotion $promotion)
    {
        Gate::forUser($request->user())->authorize('update', $promotion);

        return response()->json([
            'message' => 'Publicación archivada correctamente.',
            'promotion' => new PromotionResource(
                $this->promotionService->archive($promotion)
            ),
        ]);
    }
}
