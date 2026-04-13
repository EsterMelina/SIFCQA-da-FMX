<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Player;
use App\Models\Association;

class PlayerSeeder extends Seeder
{
    public function run(): void
    {
        $association = Association::first();

        Player::create([
            'full_name'      => 'João Silva',
            'email'          => 'joao@player.com',
            'birth_date'     => '2000-05-10',
            'nationality'    => 'Moçambicana',
            'association_id' => $association?->id,
            'status'         => true,
        ]);

        Player::create([
            'full_name'      => 'Carlos Mendes',
            'email'          => 'carlos@player.com',
            'birth_date'     => '2010-03-15',
            'nationality'    => 'Moçambicana',
            'association_id' => $association?->id,
            'status'         => true,
        ]);
    }
}