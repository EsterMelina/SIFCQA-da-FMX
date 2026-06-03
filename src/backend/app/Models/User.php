<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

   protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'dataNascimento',
        'genero'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'dataNascimento' => 'date',
    ];

    public function fmxStaff()
    {
        return $this->hasOne(FmxStaff::class);
    }

    public function player()
    {
        return $this->hasOne(Player::class);
    }

    public function associationMemberships()
    {
        return $this->hasMany(AssociationMember::class);
    }


    public function associationMember()
    {
        return $this->hasOne(AssociationMember::class);
    }

    public function getTypeAttribute()
    {
        if ($this->hasRole('admin')) return 'admin';
        if ($this->hasRole('fmx')) return 'fmx';
        if ($this->hasRole('association')) return 'association';

        if ($this->relationLoaded('player') && $this->player) return 'player';

        return 'guest';
    }

}