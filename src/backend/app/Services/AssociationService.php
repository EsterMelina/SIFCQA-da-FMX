<?php

namespace App\Services;

use App\Models\Association;
use Illuminate\Support\Facades\Log;
use App\Models\AssociationMember;

class AssociationService
{
   public function getAll()
{
    return Association::with(['members.user'])
    ->get()
    ->map(function ($a) {

        $presidentMember = $a->members
            ->where('position', 'Presidente')
            ->where('active', true)
            ->first();

        $president = $presidentMember?->user;

        return [
            'id' => $a->id,
            'name' => $a->name,
            'contact_email' => $a->contact_email,
            'phone' => $a->phone,
            'address' => $a->address,
            'status' => $a->status,

            'president' => $president ? [
                'id' => $president->id,
                'name' => $president->name,
                'email' => $president->email,
            ] : null,
        ];
    });
}

    public function getById(Association $association)
    {
        return $association;
    }

    public function create(array $data)
    {
        return Association::create($data);
    }

    public function update(Association $association, array $data)
    {
        $association->update($data);

        return $association;
    }

    public function toggleStatus(Association $association)
    {
        $association->status = !$association->status;
        $association->save();

        return $association;
    }
}