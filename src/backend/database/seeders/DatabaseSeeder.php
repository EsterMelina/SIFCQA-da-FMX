<?php

namespace Database\Seeders;

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
            UserSeeder::class,
        ]);
    }
}