<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\FmxService;

class FmxController extends Controller
{
    protected $service;
    public function createStaff(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'position' => 'required|string'
        ]);

        return response()->json(
            $this->service->createStaff($data),
            201
        );
    }

    public function assignPresident(Request $request, $id)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        return response()->json(
            $this->service->assignPresident($id, $data['user_id'])
        );
    }
}
