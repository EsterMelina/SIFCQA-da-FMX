<?php

namespace App\Services;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;



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


    public function logout($user)
    {
        $user->tokens()->delete();
    }

   
    //==================================================================================================
    //
    //Este é mais rápido no login... vamos analizar no futuro as complicacoes de nao buscar permissions
    //
    //==================================================================================================//
    public function me($user)
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames(),
        ];
    }



    // public function forgotPassword(string $email)
    // {
    //     $status = Password::sendResetLink(['email' => $email]);

    //     if ($status !== Password::RESET_LINK_SENT) {
    //         throw ValidationException::withMessages([
    //             'email' => ['Erro ao enviar email']
    //         ]);
    //     }

    //     return true;
    // }

    public function forgotPassword(string $email)
{
    Log::info("🔐 forgotPassword START", ['email' => $email]);

    try {
        $status = Password::sendResetLink(['email' => $email]);

        Log::info("📨 reset link status", ['status' => $status]);

        if ($status !== Password::RESET_LINK_SENT) {
            Log::warning("❌ reset link FAILED", ['status' => $status]);

            throw ValidationException::withMessages([
                'email' => ['Erro ao enviar email: ' . $status]
            ]);
        }

        Log::info("✅ reset link SENT successfully");

        return true;

    } catch (\Throwable $e) {
        Log::error("💥 forgotPassword EXCEPTION", [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        throw $e; // importante para manter o 500 visível
    }
}

public function sendResetLink(string $email)
{
    Log::info("🔐 RESET START", ['email' => $email]);

    // 🔍 verifica se user existe
    $user = \App\Models\User::where('email', $email)->first();

    if (!$user) {
        throw \Illuminate\Validation\ValidationException::withMessages([
            'email' => ['Email não encontrado']
        ]);
    }

    // 🔑 gera token
    $token = Str::random(60);

    DB::table('password_reset_tokens')->updateOrInsert(
        ['email' => $email],
        [
            'email' => $email,
            'token' => bcrypt($token),
            'created_at' => now()
        ]
    );
    //==================================================
    //Recordar de colocar em queries quando integrar smtp
    //==================================================
    // 🔗 link para o React
    $link = "http://localhost:5173/reset-password?token=$token&email=$email";

    Log::info("🔗 RESET LINK", ['link' => $link]);

    // 📧 envia email (simples)
    Mail::raw("Clique aqui para resetar a senha: $link", function ($message) use ($email) {
        $message->to($email)
                ->subject('Reset Password');
    });

    Log::info("✅ RESET EMAIL SENT");
}



   public function resetPassword(string $email, string $token, string $password)
{
    $record = DB::table('password_reset_tokens')
        ->where('email', $email)
        ->first();

    if (!$record || !Hash::check($token, $record->token)) {
        throw \Illuminate\Validation\ValidationException::withMessages([
            'token' => ['Token inválido ou expirado']
        ]);
    }

    $user = \App\Models\User::where('email', $email)->first();

    $user->update([
        'password' => bcrypt($password)
    ]);

    // 🧹 limpa token
    DB::table('password_reset_tokens')
        ->where('email', $email)
        ->delete();

    return true;
}
}