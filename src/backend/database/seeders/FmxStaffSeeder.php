<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Fmx; // Ajuste o nome do modelo conforme sua migration (pode ser Fmxe)
use App\Models\FmxStaff;
use Illuminate\Support\Facades\Hash;

class FmxStaffSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Garantir que exista um registro FMX (federação)
        // Se já houver, apenas recupere o primeiro; senão, crie um padrão
        $fmx = Fmx::first();
        if (!$fmx) {
            $fmx = Fmx::create([
                'name' => 'Federação de Motocross',
                'code' => 'FMX001',
                // Adicione outros campos obrigatórios da sua tabela fmxes, se houver
            ]);
        }

        // 2. Criar (ou obter) o usuário FMX
        $user = User::firstOrCreate(
            ['email' => 'fmx@fmx.org'],
            [
                'name' => 'FMX Admin',
                'password' => Hash::make('password'),
            ]
        );

        // Garantir que o usuário tenha a role 'fmx'
        if (!$user->hasRole('fmx')) {
            $user->assignRole('fmx');
        }

        // 3. Criar o staff, agora com fmx_id preenchido
        FmxStaff::firstOrCreate(
            [
                'user_id' => $user->id,
                'fmx_id' => $fmx->id,
            ],
            [
                'position' => 'National Admin',
                'active' => true,
            ]
        );
    }
}