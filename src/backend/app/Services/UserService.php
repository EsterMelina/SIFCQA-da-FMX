<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Illuminate\Validation\ValidationException;

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

    public function create(array $data)
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'status' => $data['status'] ?? true
        ]);

        if (isset($data['role'])) {
            $user->assignRole($data['role']);
        }

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