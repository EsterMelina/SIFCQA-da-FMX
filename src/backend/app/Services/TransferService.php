<?php

namespace App\Services;

use App\Models\Transfer;

class TransferService
{
    public function create(array $data)
    {
        return Transfer::create([
            ...$data,
            'status' => 'pending',
        ]);
    }

    public function cancel(Transfer $transfer)
    {
        if ($transfer->status !== 'pending') {
            abort(400, 'Only pending transfers can be cancelled');
        }

        $transfer->update([
            'status' => 'rejected'
        ]);

        return $transfer;
    }

    public function getPlayerTransfers($playerId)
    {
        return Transfer::with(['player', 'fromAssociation', 'toAssociation'])
            ->where('player_id', $playerId)
            ->get();
    }
}