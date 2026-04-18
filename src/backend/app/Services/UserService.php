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
    public function getAll()
    {
        return User::with('roles')->get();
    }

    public function getById(User $user)
    {
        return $user->load('roles');
    }

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

    public function delete(User $user)
    {
        $user->delete();
    }

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
