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

        // ================= FMX USER =================
        $fmxUser = User::create([
            'name' => 'FMX User',
            'email' => 'fmx@fmx.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);

        $fmxUser->assignRole('fmx');

        // ================= ASSOCIATION USER =================
        $associationUser = User::create([
            'name' => 'Association User',
            'email' => 'association@fmx.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);

        $associationUser->assignRole('association');

        // ================= PLAYER USER =================
        $playerUser = User::create([
            'name' => 'Player User',
            'email' => 'player@fmx.com',
            'email_verified_at' => null,
            'password' => Hash::make('password123'),
        ]);

        // ❌ NÃO atribui role player
    }
}