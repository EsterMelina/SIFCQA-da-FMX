<?php

namespace Database\Seeders;

use App\Models\AssociationMember;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ❌ DELETE any lines like these:
        // User::factory(10)->create();
        // User::factory()->create(['email' => 'test@example.com', ...]);

        // ✅ Keep only this:
        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            FMXSeeder::class,
            AssociationSeeder::class,   
            PlayerSeeder::class,
            FmxStaffSeeder::class,      
        ]);
    }
}