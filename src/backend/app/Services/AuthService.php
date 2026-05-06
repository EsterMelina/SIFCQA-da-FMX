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
use Illuminate\Support\Facades\URL;
use App\Models\User;
use Carbon\Carbon;


class AuthService
{
//==================================================================================================
// Este método é chamado quando um usuário tenta logar
//==================================================================================================//  
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
    //         'user' => [
    //             'id' => $user->id,
    //             'name' => $user->name,
    //             'email' => $user->email,
    //         ],
    //         'roles' => $user->getRoleNames(),
    //         'permissions' => $user->getAllPermissions()->pluck('name'),
    //         'token' => $token,
    //     ];
    // }

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

   $user = Auth::user()->load('player', 'roles');

    return [
        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'type' => $user->type, // 🔥 mágico agora
        ],
        'roles' => $user->getRoleNames(),
        'permissions' => $user->getAllPermissions()->pluck('name'),
        'token' => $token,
    ];
}

//==================================================================================================
// Este método é chamado quando um usuário quer se deslogar
//==================================================================================================//  
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



//==================================================================================================
// Este método é chamado quando um usuário esquece a senha e quer resetar
//==================================================================================================//  
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

//==================================================================================================
// Métodos customizados para resetar senha e setar senha via convite, para não depender do sistema default do 
// Laravel que é mais complexo e não se encaixa bem no nosso fluxo
//==================================================================================================//  
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
    //$link = $link = config('app.frontend_url') . "/set-password?token=$token&email=$email&type=invite";
    $link = config('app.frontend_url') . "/set-password?token=$token&email=$email&type=reset";
    Log::info("🔗 RESET LINK", ['link' => $link]);

    // 📧 envia email (simples)
    Mail::raw("Clique aqui para resetar a senha: $link", function ($message) use ($email) {
        $message->to($email)
                ->subject('Reset Password');
    });

    Log::info("✅ RESET EMAIL SENT");
}


//==================================================================================================
// Este método é chamado quando um usuário esquece a senha e quer resetar
//==================================================================================================//  
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

//==================================================================================================
// Este método é chamado quando um admin cria um usuário sem senha, para enviar o convite
//==================================================================================================//  
 public function setPassword(string $token, string $password): void
    {
        $hashedToken = hash('sha256', $token);

        $invite = DB::table('user_invites')
            ->where('token', $hashedToken)
            ->first();

        if (!$invite) {
            throw ValidationException::withMessages([
                'token' => ['Token inválido']
            ]);
        }

        if (Carbon::parse($invite->expires_at)->isPast()) {
            throw ValidationException::withMessages([
                'token' => ['Token expirado']
            ]);
        }

        $user = User::where('email', $invite->email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['Utilizador não encontrado']
            ]);
        }

        $user->update([
            'password' => Hash::make($password),
            'email_verified_at' => now()
        ]);

        DB::table('user_invites')
            ->where('email', $invite->email)
            ->delete();
    }


    //==================================================================================================
    // Este método é chamado quando um admin cria um usuário sem senha, para enviar o convite
    //==================================================================================================//      
public function sendInvite(User $user): void
{
    Log::info('SEND INVITE INICIOU');
    // 1. gera token
    $token = Str::random(60);

    // DB::table('user_invites')->insert([
    //     'email'      => $user->email,
    //     'token'      => $token,
    //     'expires_at' => now()->addHours(24),
    //     'created_at' => now()
    // ]);
    DB::table('user_invites')->insert([
        'email' => $user->email,
        'token' => hash('sha256', $token),
        'expires_at' => now()->addHours(24),
        'created_at' => now()
    ]);

    // 2. link
    $link = config('app.frontend_url') . "/set-password?token=$token&email={$user->email}&type=invite";

    Log::info("📨 INVITE LINK", ['link' => $link]);

    // 3. email
    try {
        Mail::raw("Você foi convidado. Defina sua senha: $link", function ($message) use ($user) {
            $message->to($user->email)
                    ->subject('Convite para acesso');
        });

        Log::info("MAIL ENVIADO", ['email' => $user->email]);

    } catch (\Throwable $e) {
        Log::error("MAIL ERROR", [
            'message' => $e->getMessage()
        ]);
    }
}

//==================================================================================================
// Método para resolver o tipo do usuário baseado em roles
//==================================================================================================//
public static function resolveUserType(User $user): string
{
    $roles = $user->getRoleNames();
    if ($roles->contains('admin')) {
        return 'admin';
    }
    return 'user';
}
}
