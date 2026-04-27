<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use App\Models\FmxStaff;
use Illuminate\Validation\ValidationException;
use App\Models\AssociationMember;

class FmxService
{
    // 🔴 Criar staff da FMX
    public function createStaff(array $data)
    {
        return FmxStaff::create([
            'user_id' => $data['user_id'],
            'fmx_id' => 1, // por agora
            'position' => $data['position']
        ]);
    }

    // 🟣 Definir presidente da associação
    public function assignPresident(int $associationId, int $userId)
    {
        // remove antigo
        AssociationMember::where('association_id', $associationId)
            ->where('position', 'president')
            ->delete();

        return AssociationMember::create([
            'user_id' => $userId,
            'association_id' => $associationId,
            'position' => 'president'
        ]);
    }

    // // 🔵 Adicionar membro à associação (secretário, etc)
    // public function addAssociationMember(int $userId, int $associationId, string $role = 'member')
    // {
    //     return DB::table('association_members')->insert([
    //         'user_id' => $userId,
    //         'association_id' => $associationId,
    //         'role' => $role,
    //         'created_at' => now(),
    //         'updated_at' => now(),
    //     ]);
    // }
}