<?php

namespace App\Services;

use App\Models\Association;

class AssociationService
{
    public function getAll()
    {
        return Association::all();
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