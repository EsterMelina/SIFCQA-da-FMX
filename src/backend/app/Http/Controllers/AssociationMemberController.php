<?php

namespace App\Http\Controllers;


use Illuminate\Http\Request;

class AssociationMemberController extends Controller
{
    protected $service;
    public function store(Request $request, $id)
    {
        
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'position' => 'required|string'
        ]);

        return response()->json(
            $this->service->addMember($id, $data),
            201
        );
    }
}
