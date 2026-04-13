<?php

namespace App\Services;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthService
{

    public function login(array $data)
    {
        if (!Auth::attempt($data)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas'],
            ]);
        }

        $user = Auth::user();

        if (!$user->status) {
            throw ValidationException::withMessages([
                'user' => ['Usuário desativado'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'token' => $token,
        ];
    }
    // public function login(array $data)
    // {
    //     if (!Auth::attempt($data)) {
    //         throw ValidationException::withMessages([
    //             'email' => ['Credenciais inválidas'],
    //         ]);
    //     }

    //     $user = Auth::user();

    //     if (!$user->status) {
    //         throw ValidationException::withMessages([
    //             'user' => ['Usuário desativado'],
    //         ]);
    //     }

    //     $token = $user->createToken('auth_token')->plainTextToken;

    //     return [
    //         'user' => $user,
    //         'roles' => $user->getRoleNames(),
    //         'permissions' => $user->getAllPermissions(),
    //         'token' => $token,
    //     ];
    // }

    public function logout($user)
    {
        $user->tokens()->delete();
    }

    // public function me($user)
    // {
    //     return [
    //         'user' => $user,
    //         'roles' => $user->getRoleNames(),
    //         'permissions' => $user->getAllPermissions(),
    //     ];
    // }
    //==================================================================================================
    //
    //Este é mais rápido no login... vamos analizar no futuro as complicacoes de nao buscar permissions
    //
    //==================================================================================================//
    // public function me($user)
    // {
    //     return [
    //         'id' => $user->id,
    //         'name' => $user->name,
    //         'email' => $user->email,
    //         'roles' => $user->getRoleNames(),
    //     ];
    // }

    public function me(Request $request)
{
    return $request->user()->only([
        'id',
        'name',
        'email'
    ]) + [
        'roles' => $request->user()
            ->roles()
            ->pluck('name')
    ];
}

    public function forgotPassword(string $email)
    {
        $status = Password::sendResetLink(['email' => $email]);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => ['Erro ao enviar email']
            ]);
        }

        return true;
    }

    public function resetPassword(array $data)
    {
        $status = Password::reset(
            $data,
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['Erro ao redefinir senha']
            ]);
        }

        return true;
    }
}