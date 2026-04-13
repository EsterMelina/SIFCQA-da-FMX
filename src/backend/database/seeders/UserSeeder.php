<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ================= ADMIN =================
        $admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@fmx.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);
        $admin->assignRole('admin');

        // ================= PLAYER =================
        $player = User::create([
            'name' => 'John Player',
            'email' => 'player@fmx.com',
            'email_verified_at' => null,
            'password' => Hash::make('password123'),
        ]);
        $player->assignRole('player');

        // ================= ASSOCIATION =================
        $association = User::create([
            'name' => 'Association Manager',
            'email' => 'association@fmx.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);
        $association->assignRole('association');

        // ================= FMX =================
        $fmx = User::create([
            'name' => 'FMX Operator',
            'email' => 'fmx@fmx.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);
        $fmx->assignRole('fmx');
    }
}