<?php
// ─────────────────────────────────────────────────────
// FILE: App/Http/Requests/CreateQuotaRequest.php
// ─────────────────────────────────────────────────────
 
namespace App\Http\Requests;
 
use Illuminate\Foundation\Http\FormRequest;
 
class CreateQuotaRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Só membros de associação (presidente / secretária)
        return $this->user()->hasRole('association');
    }
 
    public function rules(): array
    {
        return [
            // 'association_id' => ['required', 'integer', 'exists:associations,id'],
            'player_id'      => ['required', 'integer', 'exists:players,id'],
            'title'          => ['required', 'string', 'max:255'],
            'total_amount'   => ['required', 'numeric', 'min:1'],
            'due_date'       => ['required', 'date', 'after:today'],
        ];
    }
 
    public function messages(): array
    {
        return [
            'total_amount.min' => 'O valor total deve ser maior que zero.',
            'due_date.after'   => 'A data limite deve ser futura.',
        ];
    }
}