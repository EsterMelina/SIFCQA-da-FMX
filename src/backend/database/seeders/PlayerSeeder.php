<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Player;
use App\Models\User;
use App\Models\Association;

class PlayerSeeder extends Seeder
{
    public function run(): void
    {

       $user = User::where('email', 'player@fmx.com')->first();

        Player::create([
            'user_id' => $user->id,
            'association_id' => 1
        ]);
    }
}