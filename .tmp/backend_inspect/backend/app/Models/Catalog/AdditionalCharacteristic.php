<?php

namespace App\Models\Catalog;

use App\Models\Commercial\QuoteRequestDetail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

#[Table('catalog_additional_characteristics')]

#[Fillable(
    'code',
    'name',
    'is_active'
)]
class AdditionalCharacteristic extends Model
{
    protected $table = 'catalog_additional_characteristics';

    protected $fillable = ['code', 'name', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function productTypes()
    {
        return $this->belongsToMany(
            Type::class,
            'catalog_product_type_characteristics',
            'characteristic_id',
            'product_type_id'
        );
    }

    public function quoteRequestDetails()
    {
        return $this->belongsToMany(
            QuoteRequestDetail::class,
            'commercial_quote_request_detail_characteristics',
            'characteristic_id',
            'quote_request_detail_id'
        );
    }
}
