<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@fmx.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);
        $admin->assignRole('admin');

        $player = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'email_verified_at' => null,
            'password' => Hash::make('password123'),
        ]);
        $player->assignRole('player');


        $assoc = User::create([
            'name' => 'Admin',
            'email' => 'assoc@fmx.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);
        $assoc->assignRole('association');
    }
}