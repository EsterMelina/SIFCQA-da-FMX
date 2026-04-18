<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AuthService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;


class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required'
        ]);

        $result = $this->authService->login($data);

        return response()->json($result);
    }

    public function logout(Request $request)
    {
        $this->authService->logout($request->user());

        return response()->json([
            'message' => 'Logout efetuado com sucesso'
        ]);
    }

    public function me(Request $request)
    {
        return response()->json(
            $this->authService->me($request->user())
        );
    }

    // public function forgotPassword(Request $request)
    // {
    //     $request->validate([
    //         'email' => 'required|email'
    //     ]);

    //     $this->authService->forgotPassword($request->email);

    //     return response()->json([
    //         'message' => 'Link de recuperação enviado'
    //     ]);
    // }

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