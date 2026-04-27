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
            'contact_email' => 'nullable|email'
        ]);

        return response()->json(
            $this->service->create($data),
            201
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