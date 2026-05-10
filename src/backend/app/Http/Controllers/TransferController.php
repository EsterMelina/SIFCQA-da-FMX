<?php

namespace App\Http\Controllers;

use App\Models\Transfer;
use Illuminate\Http\Request;
use App\Services\TransferService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class TransferController extends Controller
{
    public function __construct(protected TransferService $service) {}

    /*
    |--------------------------------------------------------------------------
    | 1. PLAYER — Criar pedido
    |--------------------------------------------------------------------------
    */
    public function store(Request $request)
    {

    logger()->info('USER AUTH CHECK', [
    'user' => auth()->user(),
    'roles' => auth()->user()?->roles,
]);

    Log::info('REQUEST transferencia', [
    'method' => request()->method(),
    'url' => request()->fullUrl(),
    'headers' => request()->headers->all(),
    'body' => request()->all(),
    'ip' => request()->ip(),
]);

        $data = $request->validate([
            'player_id'           => 'required|exists:players,id',
            'from_association_id' => 'required|exists:associations,id',
            'to_association_id'   => 'required|exists:associations,id|different:from_association_id',
            'reason'              => 'required|string|min:10',
        ]);

        $data['requested_by'] = auth()->id();

        return response()->json($this->service->create($data), 201);
    }

    /*
    |--------------------------------------------------------------------------
    | 2a. ASSOCIAÇÃO ORIGEM — Aprovar saída (envia foto do documento)
    |--------------------------------------------------------------------------
    */
    public function approveByOrigin(Request $request, Transfer $transfer)
    {
        $request->validate([
            'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        return response()->json(
            $this->service->approveByOrigin($transfer, $request->file('document'))
        );
    }

    /*
    |--------------------------------------------------------------------------
    | 2b. ASSOCIAÇÃO ORIGEM — Rejeitar saída
    |--------------------------------------------------------------------------
    */
    public function rejectByOrigin(Request $request, Transfer $transfer)
    {
        $request->validate([
            'reason' => 'required|string|min:5',
        ]);

        return response()->json(
            $this->service->rejectByOrigin($transfer, $request->input('reason'))
        );
    }

    /*
    |--------------------------------------------------------------------------
    | 3a. ASSOCIAÇÃO DESTINO — Aceitar entrada
    |--------------------------------------------------------------------------
    */
    public function approveByDestination(Transfer $transfer)
    {
        return response()->json(
            $this->service->approveByDestination($transfer, auth()->id())
        );
    }

    /*
    |--------------------------------------------------------------------------
    | 3b. ASSOCIAÇÃO DESTINO — Rejeitar entrada
    |--------------------------------------------------------------------------
    */
    public function rejectByDestination(Request $request, Transfer $transfer)
    {
        $request->validate([
            'reason' => 'required|string|min:5',
        ]);

        return response()->json(
            $this->service->rejectByDestination($transfer, $request->input('reason'))
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PLAYER — Cancelar pedido
    |--------------------------------------------------------------------------
    */
    public function cancel(Transfer $transfer)
    {
        return response()->json($this->service->cancel($transfer));
    }

    /*
    |--------------------------------------------------------------------------
    | Histórico de transferências de um jogador
    |--------------------------------------------------------------------------
    */
    public function playerTransfers(int $playerId)
    {
        return response()->json($this->service->getPlayerTransfers($playerId));
    }

    public function associationTransfers(int $associationId)
    {
        return Transfer::with(['player', 'fromAssociation', 'toAssociation'])
            ->where('from_association_id', $associationId)
            ->orWhere('to_association_id', $associationId)
            ->latest()
            ->get();
    }
}