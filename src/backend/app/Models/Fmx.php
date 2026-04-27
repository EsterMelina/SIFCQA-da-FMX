<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Fmx extends Model
{
   protected $fillable = [
        'name',
        'contact_email',
        'phone',
        'address'
    ];

    public function staff()
    {
        return $this->hasMany(FmxStaff::class);
    }
}
