<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Association;

class AssociationSeeder extends Seeder
{
    public function run(): void
    {
        Association::create([
            'name' => 'Federação de Futebol de Maputo',
            'email' => 'futebol@maputo.co.mz',
            'phone' => '+258841112223',
            'address' => 'Maputo - Moçambique',
            'status' => true
        ]);

        Association::create([
            'name' => 'Associação Desportiva de Matola',
            'email' => 'matola@desporto.co.mz',
            'phone' => '+258843334445',
            'address' => 'Matola - Moçambique',
            'status' => true
        ]);

        Association::create([
            'name' => 'Liga Amadora de Futebol',
            'email' => 'liga@amadora.co.mz',
            'phone' => '+258845556667',
            'address' => 'Maputo - Moçambique',
            'status' => false
        ]);
    }
}