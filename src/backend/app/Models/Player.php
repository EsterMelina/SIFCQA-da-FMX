<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Player extends Model
{
    use HasFactory,SoftDeletes;
protected $casts = [
    'active' => 'boolean',
    'is_student' => 'boolean',   // opcional
];
  protected $fillable = ['user_id', 'association_id', 'position', 'active', 'fide-id', 'rating',  'membership', 'is_student' ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function association()
    {
        return $this->belongsTo(Association::class);
    }
}