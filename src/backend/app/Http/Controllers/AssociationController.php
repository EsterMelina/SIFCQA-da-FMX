<?php

namespace App\Http\Controllers;

use App\Models\Association;
use Illuminate\Http\Request;
use App\Services\AssociationService;
use App\Models\AssociationMember;
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

    // AssociationController.php


//  PATCH update - permite atualizar os dados da associação, exceto status (que tem endpoint específico)
public function update(Request $request, $id)
{
    $association = Association::findOrFail($id);

    $data = $request->validate([
        'name'    => 'sometimes|required|string|max:255',
        'email'   => 'nullable|email',
        'phone'   => 'nullable|string',
        'address' => 'nullable|string',
        'status'  => 'nullable|boolean',
    ]);

    $association->update($data);
    return $association;
}


//
//Retorna os dados do usuário logado, incluindo informações da associação e do cargo
//
public function me(Request $request)
{
    $user = $request->user();

    $member = AssociationMember::with('association')
        ->where('user_id', $user->id)
        ->first();

    if (!$member) {
        return response()->json([
            'message' => 'Membro da associação não encontrado.'
        ], 404);
    }

    return response()->json([

        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,

            // Avatar automático bonito
            'avatar' => 'https://ui-avatars.com/api/?name=' .
                urlencode($user->name) .
                '&background=random',
        ],

        'association_member' => [
            'id' => $member->id,
            'position' => $member->position,
            'active' => $member->active,
        ],

        'association' => [
            'id' => $member->association?->id,
            'name' => $member->association?->name,
            'email' => $member->association?->email,
            'phone' => $member->association?->phone,
            'address' => $member->association?->address,
            'status' => $member->association?->status,
        ],

        'roles' => $user->getRoleNames(),
    ]);
}


}