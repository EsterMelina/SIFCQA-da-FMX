<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Mail\SetPasswordMail;
use Carbon\Carbon;

class UserService
{

    //================================================================================================
    // Este método é chamado quando um admin ou association quer ver a lista de usuários
    //================================================================================================//    
    public function getAll()
    {
        return User::with('roles')->get();
    }


//==================================================================================================
// Este método é chamado quando um admin ou association quer ver os detalhes de um usuário
//==================================================================================================//  
    public function getById(User $user)
    {
        return $user->load('roles');
    }

    //==================================================================================================
    // Este método é chamado quando um admin cria um usuário com senha  [ainda por configurar]
    //==================================================================================================//  

    // public function create(array $data)
    // {
    //     $user = User::create([
    //         'name' => $data['name'],
    //         'email' => $data['email'],
    //         'password' => Hash::make($data['password']),
    //         'status' => $data['status'] ?? true
    //     ]);

    //     if (isset($data['role'])) {
    //         $user->assignRole($data['role']);
    //     }

    //     return $user->load('roles');
    // }

//==================================================================================================
// Este método é chamado quando um admin cria um usuário sem senha, para enviar o convite
//==================================================================================================//  
public function create(array $data)
{
    $user = User::create([
        'name' => $data['name'],
        'email' => $data['email'],
        'password' => null, // 👈 importante
        'status' => $data['status'] ?? true
    ]);

    if (isset($data['role'])) {
        $user->assignRole($data['role']);
    }

    // gerar token
    $token = Str::random(64);

    DB::table('user_invites')->insert([
        'email' => $user->email,
        'token' => hash('sha256', $token), // 👈 nunca guardar token puro
        'expires_at' => Carbon::now()->addHours(24),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // enviar email
    Mail::to($user->email)->send(new SetPasswordMail($token, $user));

    return $user->load('roles');
}

//==================================================================================================
// Este método é chamado quando um admin quer excluir um usuário
// Um user quer actualizar seu dados tambem
//==================================================================================================//
    public function update(User $user, array $data)
    {
        $user->update([
            'name' => $data['name'] ?? $user->name,
            'email' => $data['email'] ?? $user->email,
            'status' => $data['status'] ?? $user->status
        ]);

        if (isset($data['password'])) {
            $user->update([
                'password' => Hash::make($data['password'])
            ]);
        }

        return $user->load('roles');
    }

    //==================================================================================================
    // Este método é chamado quando um admin quer excluir um usuário
    // ou um admin, association, fmx quer excluir um user
    //==================================================================================================//

    public function delete(User $user)
    {
        $user->delete();
    }

    // Este método é chamado quando um admin quer mudar a role de um usuário
    public function updateRole(User $user, string $role)
    {
        if (!Role::where('name', $role)->exists()) {
            throw ValidationException::withMessages([
                'role' => ['Role não existe']
            ]);
        }

        $user->syncRoles([$role]);

        return $user->load('roles');
    }
}
