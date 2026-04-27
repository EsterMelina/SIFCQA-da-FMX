<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FmxStaff extends Model
{
    use HasFactory;

    protected $table = 'fmx_staff';

    protected $fillable = [
    'user_id',
    'fmx_id', // 👈 FALTA ISSO
    'position',
    'active',
];

    // 🔗 relação com User
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function fmx()
    {
        return $this->belongsTo(Fmx::class);
    }
}