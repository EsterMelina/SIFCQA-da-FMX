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
use App\Models\Fmx;
use Illuminate\Support\Facades\Log;
use App\Models\Player;
use App\Models\Association;
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


public function store(Request $request, Association $association)
{
    $authUser = Auth::user();

    $isAdmin = $authUser->hasRole('admin');
    $isAssociation = $authUser->hasRole('association');

    Log::info('STORE PLAYER REQUEST', [
        'request' => $request->all(),
        'auth_user' => $authUser,
    ]);

    /**
     * VALIDAÇÃO BASE
     */
    $rules = [
        'name'   => 'required|string',
        'email'  => 'required|email|unique:users,email',
        'status' => 'sometimes|boolean',
    ];

    /**
     * ADMIN
     */
    if ($isAdmin) {
        $rules['password'] = 'nullable|min:6';
        $rules['role'] = 'required|string|exists:roles,name';
    }

    /**
     * ASSOCIATION
     */
    if ($isAssociation) {
        $rules['active'] = 'sometimes|boolean';
    }

    $data = $request->validate($rules);

    /**
     * CRIAR USER
     */
    $user = User::create([
        'name' => $data['name'],
        'email' => $data['email'],
        'password' => !empty($data['password'])
            ? Hash::make($data['password'])
            : null,
        'status' => $data['status'] ?? true,
    ]);

    /**
     * ADMIN FLOW
     */
    if ($isAdmin) {

        $user->assignRole($data['role']);

        return response()->json([
            'message' => 'Utilizador criado com sucesso',
            'user' => $user->load('roles'),
        ], 201);
    }

    /**
     * ASSOCIATION FLOW (PLAYER CREATION)
     */
    if ($isAssociation) {

        /**
         * FORÇA ROLE PLAYER
         */
        $user->assignRole('player');

        /**
         * CRIA PLAYER LIGADO À ASSOCIAÇÃO DA ROTA
         */
        Player::create([
            'user_id' => $user->id,
            'association_id' => $association->id,
            'position' => 'player',
            'active' => $data['active'] ?? true,
        ]);

        /**
         * ENVIAR EMAIL DE CONVITE
         */
        $this->authService->sendInvite($user);

        return response()->json([
            'message' => 'Jogador criado com sucesso',
            'user' => $user->load('roles'),
        ], 201);
    }

    return response()->json([
        'message' => 'Sem permissão'
    ], 403);
}

public function update(Request $request, User $user)
{
    Log::info('UPDATE USER REQUEST', [
        'user_id' => $user->id,
        'payload' => $request->all(),
    ]);


    $data = $request->validate([
        'name'     => 'sometimes|string',
        'email'    => 'sometimes|email|unique:users,email,' . $user->id,
        'password' => 'nullable|min:6',
        'status'   => 'sometimes|boolean',
        'position' => 'nullable|string',
    ]);

    $oldEmail = $user->email;

    $updatedUser = $this->service->update($user, $data);

    /**
     * 📩 EMAIL ALTERADO → enviar convite / notificação
     * 
     * Se alguém ganhou posição institucional
     * E ainda não ativou conta
     * → enviar convite
     */
   if (
        isset($data['position']) &&
        empty($updatedUser->password)
    ) {
        $this->authService->sendInvite($updatedUser);
    }

    /**
     * FMX STAFF
     */
    if (
        $user->hasRole('fmx') &&
        isset($data['position'])
    ) {

        $fmx = \App\Models\Fmx::first();

        if (!$fmx) {
            return response()->json([
                'message' => 'FMX não encontrada'
            ], 500);
        }

        \App\Models\FmxStaff::updateOrCreate(
            ['user_id' => $user->id],
            [
                'fmx_id'   => $fmx->id,
                'position' => $data['position'],
                'active'   => true,
            ]
        );
    }

    /**
     * ASSOCIATION MEMBER
     */
    if (
        $user->hasRole('association') &&
        isset($data['position'])
    ) {

        $associationMember = \App\Models\AssociationMember::where('user_id', $user->id)->first();

        if ($associationMember) {
            $associationMember->update([
                'position' => $data['position'],
                'active'   => true,
            ]);
        }
    }

    return response()->json(
        $updatedUser->load('roles')
    );
}





    // GET /users/{user}
    public function show(User $user)
    {
        return response()->json(
            $this->service->getById($user)
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

public function toggleStatus(User $user)
{
    // 🔁 alterna status global
    $user->status = !$user->status;
    $user->save();

    /**
     * 🟥 FMX STAFF
     */
    if ($user->hasRole('fmx')) {

        $fmxStaff = \App\Models\FmxStaff::where('user_id', $user->id)->first();

        if ($fmxStaff) {
            $fmxStaff->update([
                'active' => $user->status
            ]);
        }
    }

    /**
     * 🟦 ASSOCIATION MEMBER
     */
    if ($user->hasRole('association')) {

        $member = \App\Models\AssociationMember::where('user_id', $user->id)->first();

        if ($member) {
            $member->update([
                'active' => $user->status
            ]);
        }
    }

    return response()->json([
        'message' => 'Status atualizado com sucesso',
        'status'  => $user->status
    ]);
}


}
