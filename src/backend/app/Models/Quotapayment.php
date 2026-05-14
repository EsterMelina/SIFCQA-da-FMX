<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotaPayment extends Model
{
    protected $fillable = [
        'quota_id',
        'player_id',
        'installment_number',
        'amount',
        'method',
        'status',
        'confirmed_by',
        'confirmed_at',
        'reference',
        'external_transaction_id',
        'notes',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'confirmed_at' => 'datetime',
    ];

    // ─────────────────────────────────────────
    // Relações
    // ─────────────────────────────────────────

    public function quota(): BelongsTo
    {
        return $this->belongsTo(Quota::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    // ─────────────────────────────────────────
    // Helpers de estado
    // ─────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }
}