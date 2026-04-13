<?php

namespace App\Services;

use App\Models\Player;

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
}