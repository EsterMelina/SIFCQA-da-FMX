<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Association;
use App\Models\AssociationMember;
use Illuminate\Database\Seeder;

class AssociationSeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | ASSOCIAÇÃO 1 - MAPUTO
        |--------------------------------------------------------------------------
        */

        $maputo = Association::create([
            'name' => 'Associação Maputo',
            'contact_email' => 'maputo@fmx.com',
        ]);

        $userMaputo = User::where('email', 'association@fmx.com')->first();

        if ($userMaputo) {
            AssociationMember::create([
                'user_id' => $userMaputo->id,
                'association_id' => $maputo->id,
                'position' => 'president',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | ASSOCIAÇÃO 2 - BEIRA
        |--------------------------------------------------------------------------
        */

        $beira = Association::create([
            'name' => 'Associação Beira',
            'contact_email' => 'beira@fmx.com',
        ]);

        // tenta usar outro user (se existir)
        $userBeira = User::where('email', 'beira@fmx.com')->first();

        if ($userBeira) {
            AssociationMember::create([
                'user_id' => $userBeira->id,
                'association_id' => $beira->id,
                'position' => 'president',
            ]);
        }
    }
}