<?php

namespace App\Services;

use App\Models\AssociationMember;
use Illuminate\Validation\ValidationException;

class AssociationMemberService
{
    public function getAll()
    {
        return AssociationMember::all();
    }

    public function getById(AssociationMember $member)
    {
        return $member;
    }

     public function create(array $data)
     {
          return AssociationMember::create($data);
     }

     public function addMember(int $associationId, array $data)
     {
     // evitar duplicação
     if (AssociationMember::where([
          'user_id' => $data['user_id'],
          'association_id' => $associationId
     ])->exists()) {
          throw ValidationException::withMessages([
               'user' => 'Já pertence à associação'
          ]);
     }

     // regra: só 1 presidente
     if ($data['position'] === 'president') {
          AssociationMember::where('association_id', $associationId)
               ->where('position', 'president')
               ->delete();
     }

     return AssociationMember::create([
          'user_id' => $data['user_id'],
          'association_id' => $associationId,
          'position' => $data['position']
     ]);
     }

}