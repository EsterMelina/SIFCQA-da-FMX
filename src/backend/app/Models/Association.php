<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Association extends Model
{
   protected $fillable = [
        'name',
        'contact_email', // 👈 melhor que email
        'phone',
        'address',
        'status'
    ];

    public function members()
    {
        return $this->hasMany(AssociationMember::class);
    }

    public function players()
    {
        return $this->hasMany(Player::class);
    }
}