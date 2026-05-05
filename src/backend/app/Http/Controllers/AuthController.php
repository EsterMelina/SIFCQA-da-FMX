<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AuthService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    //==================================================================================================
    // Este método é chamado quando um usuário tenta logar
    //==================================================================================================//  
    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required'
        ]);

        $result = $this->authService->login($data);

        return response()->json($result);
    }

    //==================================================================================================
    // Este método é chamado quando um usuário quer se deslogar
    //==================================================================================================//  
    public function logout(Request $request)
    {
        $this->authService->logout($request->user());

        return response()->json([
            'message' => 'Logout efetuado com sucesso'
        ]);
    }

//==================================================================================================
// Este método é chamado para retornar os dados do usuário logado
//==================================================================================================//
    public function me(Request $request)
    {
       $user = $request->user()->load('roles', 'player', 'fmxStaff', 'associationMemberships');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name'),
            'type' => $user->type, // 🔥 mesma lógica
        ]);
    }

    private function resolveUserType(User $user)
    {
        if ($user->hasRole('admin')) return 'admin';
        if ($user->hasRole('fmx')) return 'fmx';
        if ($user->hasRole('association')) return 'association';

        if ($user->player) return 'player';

        return 'guest';
    }

//==================================================================================================
// Este método é chamado quando um usuário quer resetar a senha usando o token recebido por email
//==================================================================================================//  

   public function forgotPassword(Request $request)
{
    $request->validate([
        'email' => 'required|email'
    ]);

    $this->authService->sendResetLink($request->email);

    return response()->json([
        'message' => 'Link enviado com sucesso'
    ]);
}

//==================================================================================================
// Este método é chamado quando um usuário recebe o email de recuperação e quer resetar a senha
//==================================================================================================//  
    public function resetPassword(Request $request)
{
    $request->validate([
        'email' => 'required|email',
        'token' => 'required',
        'password' => 'required|min:6|confirmed'
    ]);

    $this->authService->resetPassword(
        $request->email,
        $request->token,
        $request->password
    );

    return response()->json([
        'message' => 'Senha atualizada com sucesso'
    ]);
}


//==================================================================================================
// Este método é chamado quando um usuário recebe o email de convite e quer definir a senha
//==================================================================================================//  
 public function setPassword(Request $request, AuthService $authService)
    {
        $request->validate([
            'token' => 'required',
            'password' => 'required|min:6|confirmed'
        ]);

        $authService->setPassword(
            $request->token,
            $request->password
        );

        return response()->json([
            'message' => 'Password definida com sucesso'
        ]);
    }
}