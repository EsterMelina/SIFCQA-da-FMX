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
        'status',
        'letter_path',
        'approved_by'
    ];

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