<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quota extends Model
{
    protected $fillable = [
        'association_id',
        'player_id',
        'created_by',
        'title',
        'total_amount',
        'installment_amount', // sempre total / 2
        'paid_amount',
        'status',
        'due_date',
    ];

    protected $casts = [
        'total_amount'       => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'paid_amount'        => 'decimal:2',
        'due_date'           => 'date',
    ];

    // ─────────────────────────────────────────
    // Relações
    // ─────────────────────────────────────────

    public function association(): BelongsTo
    {
        return $this->belongsTo(Association::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(QuotaPayment::class)->orderBy('installment_number');
    }

    public function confirmedPayments(): HasMany
    {
        return $this->hasMany(QuotaPayment::class)->where('status', 'confirmed');
    }

    // ─────────────────────────────────────────
    // Accessors calculados
    // ─────────────────────────────────────────

    /**
     * Quanto falta pagar.
     */
    public function getRemainingAttribute(): float
    {
        return (float) $this->total_amount - (float) $this->paid_amount;
    }

    /**
     * Número de pagamentos já submetidos (confirmados ou não).
     */
    public function getSubmittedInstallmentsCountAttribute(): int
    {
        return $this->payments()->whereIn('status', ['pending', 'confirmed'])->count();
    }

    /**
     * Número máximo de prestações = 2 (sempre).
     */
    public function getMaxInstallmentsAttribute(): int
    {
        return 2;
    }

    /**
     * Ainda é possível registar mais pagamentos?
     */
    public function canReceivePayment(): bool
    {
        return $this->status !== 'paid'
            && $this->status !== 'expired'
            && $this->submitted_installments_count < $this->max_installments;
    }

    /**
     * Qual a próxima prestação a pagar (1 ou 2)?
     */
    public function getNextInstallmentNumberAttribute(): int
    {
        return $this->submitted_installments_count + 1;
    }
}