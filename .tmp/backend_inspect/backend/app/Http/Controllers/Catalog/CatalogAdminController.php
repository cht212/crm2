<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreCatalogRequest;
use App\Http\Requests\Catalog\UpdateCatalogRequest;
use App\Http\Resources\Catalog\CatalogResource;
use App\Models\Catalog\AdditionalCharacteristic;
use App\Models\Catalog\Finish;
use App\Models\Catalog\Length;
use App\Models\Catalog\Product;
use App\Models\Catalog\Series;
use App\Models\Catalog\Subtype;
use App\Models\Catalog\Thickness;
use App\Models\Catalog\Type;
use App\Models\Catalog\TypeCharacteristic;
use App\Models\Catalog\TypeConfiguration;
use App\Models\Catalog\TypeFinish;
use App\Models\Catalog\TypeLength;
use App\Services\Catalog\CatalogTypeService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CatalogAdminController extends Controller
{
    public function __construct(
        private readonly CatalogTypeService $typeService,
    ) {}

    private const MAP = [
        'types' => Type::class, 'subtypes' => Subtype::class, 'products' => Product::class, 'series' => Series::class,
        'finishes' => Finish::class, 'lengths' => Length::class, 'thicknesses' => Thickness::class,
        'additional-characteristics' => AdditionalCharacteristic::class, 'type-configurations' => TypeConfiguration::class,
        'type-finishes' => TypeFinish::class, 'type-lengths' => TypeLength::class,
        'type-characteristics' => TypeCharacteristic::class,
    ];

    private function authorizeCatalog(Request $request, string $action): void
    {
        abort_unless($request->user()?->hasRole('admin'), 403);
        abort_unless($request->user()->can("catalog.$action"), 403);
    }

    private function model(string $resource): string
    {
        abort_unless(isset(self::MAP[$resource]), 404);

        return self::MAP[$resource];
    }

    public function index(Request $request, string $resource)
    {
        $this->authorizeCatalog($request, 'view');
        $model = $this->model($resource);
        $query = $model::query()->with($this->relations($resource));

        foreach (['subtype_id', 'product_type_id', 'is_active'] as $filter) {
            if ($request->filled($filter)) {
                if ($filter === 'product_type_id' && $resource === 'products') {
                    $query->whereHas('subtype', fn ($subtype) => $subtype->where('product_type_id', $request->input($filter)));
                } else {
                    $query->where($filter, $request->input($filter));
                }
            }
        }

        return CatalogResource::collection($query->paginate($request->integer('per_page', 50)));
    }

    public function store(StoreCatalogRequest $request, string $resource)
    {
        $this->authorizeCatalog($request, 'create');

        if ($resource === 'types') {
            return new CatalogResource($this->typeService->save($request->validated()));
        }

        $model = $this->model($resource);
        $item = $model::create($request->validated());

        return (new CatalogResource($item->load($this->relations($resource))))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $resource, int|string $id)
    {
        $this->authorizeCatalog($request, 'view');
        $item = $this->findItem($resource, $id);
        $item->load($this->showRelations($resource));

        return new CatalogResource($item);
    }

    public function update(UpdateCatalogRequest $request, string $resource, int|string $id)
    {
        $this->authorizeCatalog($request, 'update');

        if ($resource === 'types') {
            return new CatalogResource(
                $this->typeService->save($request->validated(), (int) $id),
            );
        }

        if ($resource === 'type-configurations' && ! TypeConfiguration::whereKey($id)->exists()) {
            $data = $request->validated();
            $data['product_type_id'] = $data['product_type_id'] ?? $id;

            return new CatalogResource(TypeConfiguration::create($data));
        }

        $item = $this->findItem($resource, $id);
        $item->update($request->validated());

        return new CatalogResource($item->fresh()->load($this->relations($resource)));
    }

    public function destroy(Request $request, string $resource, int|string $id)
    {
        $this->authorizeCatalog($request, 'delete');
        $item = $this->findItem($resource, $id);
        $item->delete();

        return response()->json(['message' => 'Catalog item deleted.']);
    }

    private function findItem(string $resource, int|string $id): Model
    {
        if ($resource === 'type-lengths') {
            [$typeId, $lengthId] = array_pad(preg_split('/[-:]/', (string) $id), 2, null);

            return TypeLength::where('product_type_id', $typeId)
                ->where('product_length_id', $lengthId)
                ->firstOrFail();
        }

        if ($resource === 'type-characteristics') {
            [$typeId, $characteristicId] = array_pad(preg_split('/[-:]/', (string) $id), 2, null);

            return TypeCharacteristic::where('product_type_id', $typeId)
                ->where('characteristic_id', $characteristicId)
                ->firstOrFail();
        }

        return $this->model($resource)::findOrFail($id);
    }

    private function relations(string $resource): array
    {
        return match ($resource) {
            'types' => ['subtypes.products', 'series', 'thicknesses', 'finishes.finish', 'lengths', 'characteristics', 'configuration'],
            'subtypes' => ['type', 'products'],
            'products' => ['subtype.type'],
            'series', 'thicknesses' => ['type'],
            'type-finishes' => ['type', 'finish'],
            default => [],
        };
    }

    private function showRelations(string $resource): array
    {
        return match ($resource) {
            'types' => ['subtypes.products', 'finishes.finish', 'lengths', 'characteristics', 'configuration'],
            default => $this->relations($resource),
        };
    }
}
