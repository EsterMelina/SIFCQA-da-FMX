<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Transfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'player_id',
        'from_association_id',
        'to_association_id',
        'requested_by',
        'approved_by',
        'status',
        'reason',
        'origin_document',
        'dest_document',
        'rejection_reason',
    ];

    /*
    |--------------------------------------------------------------------------
    | STATUS HELPERS
    |--------------------------------------------------------------------------
    */

    public function isPendingOrigin(): bool
    {
        return $this->status === 'pending_origin';
    }

    public function isPendingDestination(): bool
    {
        return $this->status === 'pending_destination';
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['pending_origin', 'pending_destination']);
    }

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    public function player()
    {
        return $this->belongsTo(Player::class);
    }

    public function fromAssociation()
    {
        return $this->belongsTo(Association::class, 'from_association_id');
    }

    public function toAssociation()
    {
        return $this->belongsTo(Association::class, 'to_association_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}