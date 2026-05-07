<?php

namespace App\Services;

use App\Models\Player;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PlayerService
{
    public function getAll()
    {
        return Player::all();
    }

    public function getAssociationPlayers($associationId)
    {
        Log::info("Fetching players for association ID: $associationId");
        Log::info("Association ID: $associationId");

        return Player::with([
                'user.roles',
                'association'
            ])
            ->where('association_id', $associationId)
            ->whereHas('user.roles', function ($query) {
                $query->where('name', 'player');
            })
            ->get();

    }

    //=========================================================//
    //  CASO SEJA NECESSÁRIO MOSTRAR OS DADOS DO USUÁRIO JUNTO //
    //=========================================================//
    // public function getAll($associationId)
    // {
    //     return Player::with('user')
    //         ->where('association_id', $associationId)
    //         ->get();
    // }

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