<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\FmxStaff;
use Illuminate\Support\Facades\Hash;

class FmxStaffSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::create([
            'name' => 'FMX Admin',
            'email' => 'fmx@fmx.org',
            'password' => Hash::make('password'),
        ]);

        $user->assignRole('fmx');

        FmxStaff::create([
            'user_id' => $user->id,
            'position' => 'National Admin',
            'active' => true,
        ]);
    }
}