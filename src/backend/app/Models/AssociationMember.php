<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssociationMember extends Model
{
      protected $fillable = [
        'user_id',
        'association_id',
        'position',
    ];

    const POSITIONS = ['president', 'secretary', 'member'];
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function association()
    {
        return $this->belongsTo(Association::class);
    }
}
