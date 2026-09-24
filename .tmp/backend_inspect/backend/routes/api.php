<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\Catalog\CatalogAdminController;
use App\Http\Controllers\Catalog\CatalogController;
use App\Http\Controllers\Commercial\AttachmentController;
use App\Http\Controllers\Commercial\QuoteController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\Promotion\PromotionController;
use App\Http\Controllers\Survey\SurveyController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Integration\ContactMessageIntegrationController;
use App\Http\Controllers\Integration\QuoteRequestIntegrationController;
use App\Http\Middleware\VerifyIntegrationApiKey;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Support\Facades\Route;

Route::group(['prefix' => 'auth'], function () {
    Route::post('login', [AuthController::class, 'login']);

    Route::group(['middleware' => ['auth:api', EnsureUserIsActive::class]], function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('user', [AuthController::class, 'user']);
    });

});

Route::group(['middleware' => ['auth:api', EnsureUserIsActive::class]], function () {
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('users', UserController::class)->only(['index', 'show', 'store', 'update']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('contact-messages', [ContactMessageController::class, 'store']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'read']);
    Route::post('notifications/{notification}/unread', [NotificationController::class, 'unread']);
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);
    Route::apiResource('promotions', PromotionController::class)->except(['destroy']);
    Route::post('promotions/{promotion}/survey', [SurveyController::class, 'store']);
    Route::post('promotions/{promotion}/archive', [PromotionController::class, 'archive']);
    Route::get('surveys/{survey}', [SurveyController::class, 'show']);
    Route::match(['put', 'patch'], 'surveys/{survey}', [SurveyController::class, 'update']);
    Route::post('surveys/{survey}/publish', [SurveyController::class, 'publish']);
    Route::post('surveys/{survey}/close', [SurveyController::class, 'close']);
    Route::get('surveys/{survey}/results', [SurveyController::class, 'results']);
    Route::get('surveys/{survey}/my-response', [SurveyController::class, 'myResponse']);
    Route::post('surveys/{survey}/responses', [SurveyController::class, 'submit']);
    Route::get(
        '/catalog/quote-configurations',
        [CatalogController::class, 'quoteConfigurations']
    );
    Route::prefix('catalog/{resource}')->controller(CatalogAdminController::class)->group(function () {
        Route::get('/', 'index');
        Route::post('/', 'store');
        Route::get('/{id}', 'show');
        Route::match(['put', 'patch'], '/{id}', 'update');
        Route::delete('/{id}', 'destroy');
    });

    // Quote Request
    Route::get('quote-requests/statuses', [QuoteController::class, 'statuses']);
    Route::get('quote-requests/{quoteRequest}/history', [QuoteController::class, 'history']);
    Route::post('quote-requests/{quoteRequest}/submit', [QuoteController::class, 'submit']);
    Route::post('quote-requests/{quoteRequest}/mark-viewed', [QuoteController::class, 'markViewed']);
    Route::apiResource('quote-requests', QuoteController::class)
        ->except(['destroy']);

    // Quote Request Attachments (Endpoints de descarga y previsualización)
    Route::get('/attachments/{attachment}/preview', [AttachmentController::class, 'preview']);
    Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download']);
});

Route::prefix('integrations/contact-messages')
    ->middleware([VerifyIntegrationApiKey::class, 'throttle:erp-integration'])
    ->group(function () {
        Route::get('/', [ContactMessageIntegrationController::class, 'index']);
        Route::get('/{contactMessage}', [ContactMessageIntegrationController::class, 'show']);
        Route::get(
            '/{contactMessage}/attachments/{attachment}',
            [ContactMessageIntegrationController::class, 'downloadAttachment'],
        )->name('integration.contact-messages.attachments.download');
        Route::post('/{contactMessage}/acknowledge', [ContactMessageIntegrationController::class, 'acknowledge']);
        Route::post('/{contactMessage}/fail', [ContactMessageIntegrationController::class, 'fail']);
    });

Route::prefix('integrations/quote-requests')
    ->middleware([VerifyIntegrationApiKey::class, 'throttle:erp-integration'])
    ->group(function () {
        Route::get('/', [QuoteRequestIntegrationController::class, 'index']);
        Route::get('/{quoteRequest}', [QuoteRequestIntegrationController::class, 'show']);
        Route::get(
            '/{quoteRequest}/attachments/{attachment}',
            [QuoteRequestIntegrationController::class, 'downloadAttachment'],
        )->name('integration.quote-requests.attachments.download');
        Route::post('/{quoteRequest}/acknowledge', [QuoteRequestIntegrationController::class, 'acknowledge']);
        Route::post('/{quoteRequest}/fail', [QuoteRequestIntegrationController::class, 'fail']);
    });
