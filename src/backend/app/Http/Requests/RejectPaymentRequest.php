<?php
// ─────────────────────────────────────────────────────
// FILE: App/Http/Requests/RejectPaymentRequest.php
// ─────────────────────────────────────────────────────
 
namespace App\Http\Requests;
 
use Illuminate\Foundation\Http\FormRequest;
 
class RejectPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('association');
    }
 
    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
 