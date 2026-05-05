<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AuthService;

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

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $this->authService->forgotPassword($request->email);

        return response()->json([
            'message' => 'Link de recuperação enviado'
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'token'    => 'required',
            'password' => 'required|min:6|confirmed'
        ]);

        $this->authService->resetPassword($data);

        return response()->json([
            'message' => 'Senha redefinida com sucesso'
        ]);
    }
}