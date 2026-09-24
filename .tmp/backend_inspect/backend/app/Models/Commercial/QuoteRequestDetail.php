<?php

namespace App\Models\Commercial;

use App\Models\Catalog\AdditionalCharacteristic;
use App\Models\Catalog\Finish;
use App\Models\Catalog\Product;
use App\Models\Catalog\Length;
use App\Models\Catalog\Type;
use Illuminate\Database\Eloquent\Model;

class QuoteRequestDetail extends Model
{
    protected $table = 'commercial_quote_request_details';

    protected $fillable = [
        'quote_request_id',
        'product_type_id',
        'subtype_id',
        'product_id',
        'finish_id',
        'thickness',
        'base',
        'height',
        'quantity',
        'observation',
        'is_active',
        'lengths_id',
    ];

    protected function casts(): array
    {
        return [
            'thickness' => 'integer',
            'base' => 'integer',
            'height' => 'integer',
            'quantity' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function quoteRequest()
    {
        return $this->belongsTo(QuoteRequest::class);
    }

    public function productType()
    {
        return $this->belongsTo(Type::class, 'product_type_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function finish()
    {
        return $this->belongsTo(Finish::class);
    }

    public function length()
    {
        return $this->belongsTo(Length::class, 'lengths_id');
    }

    public function characteristics()
    {
        return $this->belongsToMany(
            AdditionalCharacteristic::class,
            'commercial_quote_request_detail_characteristics',
            'quote_request_detail_id',
            'characteristic_id'
        );
    }
}
