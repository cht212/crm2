<?php

namespace Database\Seeders;

use App\Models\Commercial\QuoteRequest;
use App\Models\Commercial\QuoteRequestHistory;
use App\Models\Commercial\QuoteRequestStatus;
use App\Models\Catalog\Finish;
use App\Models\Catalog\Length;
use App\Models\Catalog\Product;
use App\Models\Catalog\Type;
use App\Models\Customer;
use Illuminate\Database\Seeder;

class QuoteRequestSeeder extends Seeder
{
    public function run(): void
    {
        $status = QuoteRequestStatus::where('name', 'Pendiente')->firstOrFail();
        $profilesType = Type::where('name', 'Perfiles')->firstOrFail();
        $product = Product::whereHas('subtype', fn ($query) => $query->where('product_type_id', $profilesType->id))->firstOrFail();
        $length = $profilesType->lengths()->firstOrFail();
        $finish = $profilesType->finishes()->firstOrFail()->finish;

        Customer::query()
            ->whereIn('tax_number', ['20111111111', '20222222222'])
            ->with('users')
            ->get()
            ->each(function (Customer $customer, int $index) use (
                $status,
                $profilesType,
                $product,
                $length,
                $finish,
            ): void {
                $quoteRequest = QuoteRequest::firstOrCreate(
                    [
                        'request_number' => sprintf(
                            'SC20260908%04d',
                            $index + 1,
                        ),
                    ],
                    [
                        'customer_id' => $customer->id,
                        'subject' => 'Cotización de perfiles',
                        'observations' => 'Solicitud de prueba del sistema.',
                        'status_id' => $status->id,
                        'requested_at' => now(),
                        'created_by' => $customer->users->firstOrFail()->id,
                        'is_active' => true,
                    ],
                );

                if (!$quoteRequest->wasRecentlyCreated) {
                    return;
                }

                $quoteRequest->details()->create([
                    'product_type_id' => $profilesType->id,
                    'subtype_id' => $product->subtype_id,
                    'product_id' => $product->id,
                    'lengths_id' => $length->id,
                    'finish_id' => $finish->id,
                    'thickness' => null,
                    'base' => null,
                    'height' => null,
                    'quantity' => 2,
                    'observation' => null,
                    'is_active' => true,
                ]);

                QuoteRequestHistory::create([
                    'quote_request_id' => $quoteRequest->id,
                    'action' => 'created',
                    'previous_status_id' => null,
                    'new_status_id' => $status->id,
                    'changes' => null,
                    'comment' => 'Solicitud de cotización creada por seeder.',
                    'user_id' => $customer->users->firstOrFail()->id,
                    'created_at' => now(),
                ]);
            });
    }
}
