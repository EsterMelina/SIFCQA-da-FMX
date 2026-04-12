<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
       DB::table('users')->insert([
    [
        'name' => 'Admin',
        'email' => 'admin@fmx.com',
        'email_verified_at' => now(), // ✔ agora existe
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'created_at' => now(),
        'updated_at' => now(),
    ],
    [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'email_verified_at' => null, // ainda não verificado
        'password' => Hash::make('password123'),
        'role' => 'player',
        'created_at' => now(),
        'updated_at' => now(),
    ],
]);
    }
}