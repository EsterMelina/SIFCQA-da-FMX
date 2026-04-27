<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Fmx;
use App\Models\FmxStaff;
use App\Models\User;

class FMXSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $fmx = Fmx::create([
        'name' => 'FMX',
        'contact_email' => 'geral@fmx.com'
    ]);

    $user = User::where('email', 'fmx@fmx.com')->first();

    FmxStaff::create([
        'user_id' => $user->id,
        'fmx_id' => $fmx->id,
        'position' => 'president'
    ]);
    }
}
