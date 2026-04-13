<?php

namespace App\Http\Controllers;

use App\Models\Transfer;
use Illuminate\Http\Request;
use App\Services\TransferService;

class TransferController extends Controller
{
    protected $service;

    public function __construct(TransferService $service)
    {
        $this->service = $service;
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE TRANSFER
    |--------------------------------------------------------------------------
    */
    public function store(Request $request)
    {
        $data = $request->validate([
            'player_id' => 'required|exists:players,id',
            'from_association_id' => 'required|exists:associations,id',
            'to_association_id' => 'required|exists:associations,id',
            'letter_path' => 'nullable|string',
        ]);

        $data['requested_by'] = auth()->id();

        $transfer = $this->service->create($data);

        return response()->json($transfer, 201);
    }

    /*
    |--------------------------------------------------------------------------
    | CANCEL TRANSFER
    |--------------------------------------------------------------------------
    */
    public function cancel(Transfer $transfer)
    {
        $transfer = $this->service->cancel($transfer);

        return response()->json($transfer);
    }

    /*
    |--------------------------------------------------------------------------
    | PLAYER TRANSFERS
    |--------------------------------------------------------------------------
    */
    public function playerTransfers($playerId)
    {
        $transfers = $this->service->getPlayerTransfers($playerId);

        return response()->json($transfers);
    }
}