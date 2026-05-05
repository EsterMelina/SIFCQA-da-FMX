<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Services\UserService;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    protected $service;

    public function __construct(UserService $service)
    {
        $this->service = $service;
    }

    // GET /users
    public function index()
    {
        return response()->json(
            $this->service->getAll()
        );
    }

    // POST /users
public function store(Request $request)
{
    $data = $request->validate([
        'name'     => 'required|string',
        'email'    => 'required|email|unique:users,email',
        'password' => 'required|min:6',
        'status'   => 'boolean',
        'role'     => 'required|string|exists:roles,name', // valida que a role existe no Spatie
    ]);

    $user = User::create([
        'name'     => $data['name'],
        'email'    => $data['email'],
        'password' => Hash::make($data['password']),
        'status'   => $data['status'] ?? true,
    ]);

    $user->assignRole($data['role']);

    return response()->json($user->load('roles'), 201);
}
    // GET /users/{user}
    public function show(User $user)
    {
        return response()->json(
            $this->service->getById($user)
        );
    }

    // PUT/PATCH /users/{user}
    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'sometimes|string',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:6',
            'status' => 'boolean'
        ]);

        return response()->json(
            $this->service->update($user, $data)
        );
    }

    // DELETE /users/{user}
    public function destroy(User $user)
    {
        $this->service->delete($user);

        return response()->json([
            'message' => 'Usuário removido'
        ]);
    }

    // PATCH /users/{user}/role
    public function updateRole(Request $request, User $user)
    {
        $data = $request->validate([
            'role' => 'required|string'
        ]);

        return response()->json(
            $this->service->updateRole($user, $data['role'])
        );
    }
}