<?php

namespace App\Services;

use App\Models\Player;
use Illuminate\Validation\ValidationException;

class PlayerService
{
    public function getAll()
    {
        return Player::all();
    }

    public function getById(Player $player)
    {
        return $player;
    }

    // Regra simples de elegibilidade (podes evoluir depois)
    public function checkEligibility(Player $player)
    {
        $issues = [];

        if (!$player->active) {
            $issues[] = 'Player is not active';
        }

        if (!$player->birth_date) {
            $issues[] = 'Missing birth date';
        }

        $age = $player->birth_date
            ? now()->diffInYears($player->birth_date)
            : null;

        if ($age !== null && $age < 16) {
            $issues[] = 'Player is under 16 years old';
        }

        return [
            'player_id' => $player->id,
            'eligible' => count($issues) === 0,
            'issues' => $issues,
            'age' => $age
        ];
    }

     // 🟢 CREATE
    public function create(int $associationId, int $userId)
    {
        if (Player::where('user_id', $userId)->exists()) {
            throw ValidationException::withMessages([
                'user' => 'Já é jogador'
            ]);
        }

        return Player::create([
            'user_id' => $userId,
            'association_id' => $associationId
        ]);
    }

//     public function create(array $data)
// {
//     $validated = validator($data, [
//         'user_id' => 'required|exists:users,id',
//         'association_id' => 'required|exists:associations,id',
//     ])->validate();

//     return Player::create([
//         'user_id' => $validated['user_id'],
//         'association_id' => $validated['association_id'],
//         'active' => true,
//     ]);
// }

}