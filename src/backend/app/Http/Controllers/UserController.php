<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Services\UserService;
use App\Services\AuthService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class UserController extends Controller
{
    protected $service;
    protected $authService;

  
    public function __construct(UserService $service, AuthService $authService)
    {
        $this->service = $service;
        $this->authService = $authService;
    }

    // GET /users
    public function index()
    {
        return response()->json(
            $this->service->getAll()
        );
    }

    // POST /users
// public function store(Request $request)
// {
//     $data = $request->validate([
//         'name'     => 'required|string',
//         'email'    => 'required|email|unique:users,email',
//         'password' => 'required|min:6',
//         'status'   => 'boolean',
//         'role'     => 'required|string|exists:roles,name', // valida que a role existe no Spatie
//     ]);

//     $user = User::create([
//         'name'     => $data['name'],
//         'email'    => $data['email'],
//         'password' => Hash::make($data['password']),
//         'status'   => $data['status'] ?? true,
//     ]);

//     $user->assignRole($data['role']);

//     return response()->json($user->load('roles'), 201);
// }


//==================================================================================================
// Este método é chamado quando um admin cria um usuário sem senha, para enviar o convite
//==================================================================================================//  
public function store(Request $request)
{
    $data = $request->validate([
        'name'     => 'required|string',
        'email'    => 'required|email|unique:users,email',
        'password' => 'nullable|min:6',
        'status'   => 'sometimes|boolean',
        'role'     => 'required|string|exists:roles,name',
        'association_id' => 'nullable|exists:associations,id',
        'position' => 'nullable|string', // 👈 novo campo para FMX
    ]);

    $authUser = Auth::user();
    $isAdminCreating = $authUser?->hasRole('admin') ?? false;

    $password = $data['password'] ?? null;

    if (!$isAdminCreating && !$password) {
        return response()->json([
            'message' => 'Password é obrigatória'
        ], 422);
    }

    $user = User::create([
        'name'     => $data['name'],
        'email'    => $data['email'],
        'password' => $password ? Hash::make($password) : null,
        'status'   => $data['status'] ?? true,
    ]);

    if (!$password) {
    $this->authService->sendInvite($user);
    }
    $user->assignRole($data['role']);

    // 🔥 ASSOCIATION
    if ($data['role'] === 'association' && $data['association_id']) {
        DB::table('association_members')->insert([
            'user_id' => $user->id,
            'association_id' => $data['association_id'],
            'type' => 'manager',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // 🔥 PLAYER
    if ($data['role'] === 'player' && $data['association_id']) {
        DB::table('players')->insert([
            'user_id' => $user->id,
            'association_id' => $data['association_id'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // 🟥 FMX STAFF
    if ($data['role'] === 'fmx') {
        \App\Models\FmxStaff::create([
            'user_id' => $user->id,
            'position' => $data['position'] ?? 'Staff',
            'active' => true,
        ]);
    }

    return response()->json($user->load('roles'), 201);
}

// public function store(Request $request)
// {
//     $data = $request->validate([
//         'name'  => 'required|string',
//         'email' => 'required|email|unique:users,email',
//         'password' => 'nullable|min:6',
//         'status' => 'boolean',
//     ]);

//     $user = User::create([
//         'name' => $data['name'],
//         'email' => $data['email'],
//         'password' => $data['password']
//             ? Hash::make($data['password'])
//             : null,
//         'status' => $data['status'] ?? true,
//     ]);

//     if (!$data['password']) {
//         $this->authService->sendInvite($user);
//     }

//     return response()->json($user, 201);
// }



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

    public function indexForFmx(Request $request)
{
    // Retorna todos os utilizadores (pode filtrar por role se necessário)
    $users = User::with('roles')->get();
    return response()->json($users);
}


}
