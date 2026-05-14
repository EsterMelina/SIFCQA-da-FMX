<?php
// ─────────────────────────────────────────────────────
// FILE: App/Http/Requests/SubmitPaymentRequest.php
// ─────────────────────────────────────────────────────
 
namespace App\Http\Requests;
 
use Illuminate\Foundation\Http\FormRequest;
 
class SubmitPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->player !== null;
    }
 
    public function rules(): array
    {
        return [
            // Na 1ª prestação, o frontend envia o amount para validarmos.
            // Na 2ª, não é necessário (calculado pelo sistema).
            'amount'    => ['nullable', 'numeric', 'min:0.01'],
 
            'method'    => ['required', 'in:cash,mpesa,emola,bank,gateway'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes'     => ['nullable', 'string', 'max:500'],
        ];
    }
 
    public function messages(): array
    {
        return [
            'method.in' => 'Método de pagamento inválido. Use: cash, mpesa, emola, bank ou gateway.',
        ];
    }
}
 