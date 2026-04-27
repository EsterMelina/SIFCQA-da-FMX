<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Association;
use App\Models\AssociationMember;
use App\Models\User;

class AssociationSeeder extends Seeder
{
    public function run(): void
    {
        $association = Association::create([
        'name' => 'Associação Maputo',
        'contact_email' => 'maputo@fmx.com'
    ]);

    $user = User::where('email', 'association@fmx.com')->first();

    AssociationMember::create([
        'user_id' => $user->id,
        'association_id' => $association->id,
        'position' => 'president'
    ]);
    }
}