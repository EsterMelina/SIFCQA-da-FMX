<?php

namespace App\Http\Controllers;

use App\Models\Association;
use Illuminate\Http\Request;
use App\Services\AssociationService;

class AssociationController extends Controller
{
    protected $service;

    public function __construct(AssociationService $service)
    {
        $this->service = $service;
    }

    // GET all
    public function index()
    {
        return response()->json(
            $this->service->getAll()
        );
    }

    // GET one
    public function show(Association $association)
    {
        return response()->json(
            $this->service->getById($association)
        );
    }

    // POST create
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'status' => 'boolean'
        ]);

        return response()->json(
            $this->service->create($data),
            201
        );
    }

    // PUT update
    public function update(Request $request, Association $association)
    {
        $data = $request->validate([
            'name' => 'sometimes|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'status' => 'boolean'
        ]);

        return response()->json(
            $this->service->update($association, $data)
        );
    }

    // PATCH toggle status
    public function toggleStatus(Association $association)
    {
        return response()->json(
            $this->service->toggleStatus($association)
        );
    }
}