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


public function store(Request $request)
{
    $data = $request->validate([
        'name'     => 'required|string',
        'email'    => 'required|email|unique:users,email',
        'password' => 'nullable|min:6',
        'status'   => 'sometimes|boolean',
        'role'     => 'required|string|exists:roles,name',
    ]);

    $authUser = Auth::user();

    $isAdminCreating = $authUser?->hasRole('admin') ?? false;

    /**
     * Password obrigatória se não for admin
     */
    if (!$isAdminCreating && empty($data['password'])) {
        return response()->json([
            'message' => 'Password é obrigatória'
        ], 422);
    }

    $user = User::create([
        'name'     => $data['name'],
        'email'    => $data['email'],
        'password' => !empty($data['password'])
            ? Hash::make($data['password'])
            : null,
        'status'   => $data['status'] ?? true,
    ]);

    $user->assignRole($data['role']);

    return response()->json(
        $user->load('roles'),
        201
    );
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
