<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Player extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'birth_date',
        'team',
        'active'
    ];

    protected $casts = [
        'birth_date' => 'date',
        'active' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    public function getAgeAttribute()
    {
        return $this->birth_date
            ? now()->diffInYears($this->birth_date)
            : null;
    }
}