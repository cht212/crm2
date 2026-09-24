<?php

namespace App\Http\Resources\Contact;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactMessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'message' => $this->message,
            'sent_at' => $this->sent_at,
            'customer_id' => $this->customer_id,
            'customer' => $this->whenLoaded('customer', fn () => [
                'id' => $this->customer->id,
                'company_name' => $this->customer->company_name,
                'tax_number' => $this->customer->tax_number,
            ]),
            'integration_status' => $this->integration_status,
            'integration_id' => $this->integration_id,
            'integration_error' => $this->integration_error,
            'integration_processed_at' => $this->integration_processed_at,
            'integration_attempts' => $this->integration_attempts,
            'attachments' => ContactMessageAttachmentResource::collection(
                $this->whenLoaded('attachments'),
            ),
        ];
    }
}
