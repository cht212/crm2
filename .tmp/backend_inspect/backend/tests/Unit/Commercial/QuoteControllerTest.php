<?php

namespace Tests\Unit\Commercial;

use App\Http\Controllers\Commercial\QuoteController;
use App\Http\Requests\Commercial\QuoteRequestFormRequest;
use App\Models\Commercial\QuoteRequest;
use App\Models\User;
use App\Services\Commercial\QuoteRequestService;
use Illuminate\Support\Facades\Gate;
use Mockery;
use Tests\TestCase;

class QuoteControllerTest extends TestCase
{
    public function test_store_crea_una_solicitud_de_cotizacion(): void
    {
        $user = new User(['customer_id' => 10]);
        $payload = [
            'subject' => 'Solicitud de perfiles',
            'observations' => null,
            'details' => [
                [
                    'product_type_id' => 2,
                    'product_id' => 8,
                    'lengths_id' => 1,
                    'finish_id' => 48,
                    'thickness' => null,
                    'base' => null,
                    'height' => null,
                    'quantity' => 2,
                    'observation' => null,
                ],
            ],
        ];
        $quoteRequest = new QuoteRequest(['subject' => $payload['subject']]);

        $request = Mockery::mock(QuoteRequestFormRequest::class);
        $request->shouldReceive('validated')->once()->andReturn($payload);
        $request->shouldReceive('user')->once()->andReturn($user);

        $service = Mockery::mock(QuoteRequestService::class);
        $service->shouldReceive('create')
            ->once()
            ->with($payload, $user)
            ->andReturn($quoteRequest);

        $response = (new QuoteController($service))->store($request);

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame(
            'Solicitud de cotización registrada correctamente.',
            $response->getData(true)['message'],
        );
        $this->assertSame(
            'Solicitud de perfiles',
            $response->getData(true)['quote_request']['subject'],
        );
    }

    public function test_show_devuelve_una_solicitud_de_cotizacion(): void
    {
        $user = new User(['customer_id' => 10]);
        $quoteRequest = new QuoteRequest(['subject' => 'Solicitud existente']);

        app('request')->setUserResolver(fn () => $user);
        Gate::shouldReceive('forUser')->once()->with($user)->andReturnSelf();
        Gate::shouldReceive('authorize')
            ->once()
            ->with('view', $quoteRequest)
            ->andReturnTrue();

        $service = Mockery::mock(QuoteRequestService::class);
        $service->shouldReceive('show')
            ->once()
            ->with($quoteRequest, $user)
            ->andReturn($quoteRequest);

        $response = (new QuoteController($service))->show($quoteRequest);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(
            'Solicitud existente',
            $response->getData(true)['quote_response']['subject'],
        );
    }

    public function test_update_actualiza_una_solicitud_de_cotizacion(): void
    {
        $user = new User(['customer_id' => 10]);
        $payload = [
            'subject' => 'Solicitud actualizada',
            'observations' => 'Actualizar medidas',
            'details' => [],
        ];
        $quoteRequest = new QuoteRequest(['subject' => 'Solicitud anterior']);
        $updatedQuoteRequest = new QuoteRequest(['subject' => $payload['subject']]);

        Gate::shouldReceive('forUser')->once()->with($user)->andReturnSelf();
        Gate::shouldReceive('authorize')
            ->once()
            ->with('update', $quoteRequest)
            ->andReturnTrue();

        $request = Mockery::mock(QuoteRequestFormRequest::class);
        $request->shouldReceive('validated')->once()->andReturn($payload);
        $request->shouldReceive('user')->twice()->andReturn($user);

        $service = Mockery::mock(QuoteRequestService::class);
        $service->shouldReceive('update')
            ->once()
            ->with($quoteRequest, $payload, $user)
            ->andReturn($updatedQuoteRequest);

        $response = (new QuoteController($service))->update($request, $quoteRequest);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(
            'Solicitud de cotización actualizada correctamente.',
            $response->getData(true)['message'],
        );
        $this->assertSame(
            'Solicitud actualizada',
            $response->getData(true)['quote_request']['subject'],
        );
    }
}
