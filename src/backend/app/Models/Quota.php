<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Quota extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'association_id',
        'player_id',
        'created_by',
        'title',
        'total_amount',
        'installment_amount',
        'total_installments',
        'paid_amount',
        'status',
        'due_date',
        'is_global_template',
        'target_memberships',
        'template_id',
    ];

    protected $casts = [
        'due_date' => 'date',
        'total_amount' => 'float',
        'installment_amount' => 'float',
        'paid_amount' => 'float',
        'is_global_template' => 'boolean',
        'target_memberships' => 'array',
        'total_installments' => 'integer',
    ];

    // ═══════════════════════════════════════════
    //  RELATIONSHIPS
    // ═══════════════════════════════════════════

    public function player()
    {
        return $this->belongsTo(Player::class);
    }

    public function association()
    {
        return $this->belongsTo(Association::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payments()
    {
        return $this->hasMany(QuotaPayment::class);
    }

    public function confirmedPayments()
    {
        return $this->hasMany(QuotaPayment::class)->where('status', 'confirmed');
    }

    public function pendingPayments()
    {
        return $this->hasMany(QuotaPayment::class)->where('status', 'pending');
    }

    /**
     * Template pai (se for quota individual gerada)
     */
    public function template()
    {
        return $this->belongsTo(Quota::class, 'template_id');
    }

    /**
     * Quotas geradas por este template
     */
    public function generatedQuotas()
    {
        return $this->hasMany(Quota::class, 'template_id');
    }

    // ═══════════════════════════════════════════
    //  SCOPES
    // ═══════════════════════════════════════════

    /**
     * Apenas templates globais
     */
    public function scopeTemplates(Builder $query): Builder
    {
        return $query->where('is_global_template', true);
    }

    /**
     * Apenas quotas individuais
     */
    public function scopeIndividual(Builder $query): Builder
    {
        return $query->where('is_global_template', false);
    }

    /**
     * Quotas ativas (não canceladas)
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', ['cancelled']);
    }

    // ═══════════════════════════════════════════
    //  ACCESSORS
    // ═══════════════════════════════════════════

    /**
     * Valor restante a pagar
     */
    public function getRemainingAttribute(): float
    {
        return max(0, $this->total_amount - $this->paid_amount);
    }

    /**
     * Número da próxima prestação a pagar
     */
    public function getNextInstallmentNumberAttribute(): ?int
    {
        if (!$this->canReceivePayment()) {
            return null;
        }

        $paidNumbers = $this->confirmedPayments()
            ->pluck('installment_number')
            ->toArray();

        for ($i = 1; $i <= $this->total_installments; $i++) {
            if (!in_array($i, $paidNumbers)) {
                return $i;
            }
        }

        return null;
    }

    /**
     * Prestações já pagas (confirmadas)
     */
    public function getPaidInstallmentsAttribute(): array
    {
        return $this->confirmedPayments()
            ->pluck('installment_number')
            ->toArray();
    }

    /**
     * Prestações pendentes
     */
    public function getPendingInstallmentsAttribute(): array
    {
        return $this->pendingPayments()
            ->pluck('installment_number')
            ->toArray();
    }

    // ═══════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════

    /**
     * Pode receber pagamentos?
     */
    public function canReceivePayment(): bool
    {
        return in_array($this->status, ['pending', 'partially_paid']);
    }

    /**
     * Verifica se uma prestação específica está disponível para pagamento
     */
    public function isInstallmentAvailable(int $number): bool
    {
        if ($number < 1 || $number > $this->total_installments) {
            return false;
        }

        // Verificar se já foi confirmada
        $confirmed = $this->confirmedPayments()
            ->where('installment_number', $number)
            ->exists();

        if ($confirmed) return false;

        // Verificar se já está pendente
        $pending = $this->pendingPayments()
            ->where('installment_number', $number)
            ->exists();

        return !$pending;
    }

    /**
     * Tipo de associados afetados (para templates)
     */
    public function getTargetMembershipsLabelAttribute(): string
    {
        if (!$this->target_memberships) return '—';

        $labels = [
            'fundador' => 'Fundador',
            'efetivo' => 'Efectivo',
            'atleta' => 'Atleta',
            'de_mérito' => 'De Mérito',
            'honorário' => 'Honorário',
            'patrocinador' => 'Patrocinador',
        ];

        return collect($this->target_memberships)
            ->map(fn($m) => $labels[$m] ?? $m)
            ->join(', ');
    }
}