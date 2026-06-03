<?php

namespace App\Http\Controllers;

use App\Models\Transfer;
use Illuminate\Http\Request;
use App\Services\TransferService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
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

     Log::info('🔥 TRANSFER DEBUG FULL', [
        'method' => $request->method(),
        'url' => $request->fullUrl(),

        // 👇 dados normais
        'input' => $request->all(),

        // 👇 raw body (muito importante para FormData / JSON)
        'content' => $request->getContent(),

        // 👇 headers úteis
        'headers' => $request->headers->all(),

        // 👇 auth user REAL (aqui descobres o problema de role)
        'auth_user' => auth()->user(),

        // 👇 roles reais do Spatie
        'roles' => auth()->user()?->getRoleNames(),

        // 👇 IP
        'ip' => $request->ip(),
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
    // public function approveByOrigin(Request $request, Transfer $transfer)
    // {
    //     $request->validate([
    //         'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
    //     ]);

    //     return response()->json(
    //         $this->service->approveByOrigin($transfer, $request->file('document'))
    //     );
    // }

//     public function approveByOrigin(Transfer $transfer)
// {
//     $transfer = $this->service->approveByOrigin(
//         $transfer,
//         auth()->id()
//     );

//     return response()->json($transfer);
// }

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

    // /*
    // |--------------------------------------------------------------------------
    // | 3a. ASSOCIAÇÃO DESTINO — Aceitar entrada
    // |--------------------------------------------------------------------------
    // */
    // public function approveByDestination(Transfer $transfer)
    // {
    //     return response()->json(
    //         $this->service->approveByDestination($transfer, auth()->id())
    //     );
    // }


    // TransferController.php

    //Aprovação pela origem
    public function approveByOrigin(Request $request, Transfer $transfer)
    {
        $request->validate([
            'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $transfer = $this->service->approveByOrigin(
            $transfer,
            auth()->id(),
            $request->file('document')
        );

        return response()->json($transfer);
    }

    //Aprovacao no destino    
    public function approveByDestination(Request $request, Transfer $transfer)
    {
        $request->validate([
            'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        return response()->json(
            $this->service->approveByDestination(
                $transfer,
                auth()->id(),
                $request->file('document')
            )
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
//     public function associationTransfers(int $associationId)
// {
//     return Transfer::with(['player', 'fromAssociation', 'toAssociation'])
//         ->where(function ($query) use ($associationId) {

//             // 📤 ORIGEM → vê tudo que sai daqui
//             $query->where('from_association_id', $associationId);

//             // 📥 DESTINO → só vê se já passou origem
//             $query->orWhere(function ($q) use ($associationId) {
//                 $q->where('to_association_id', $associationId)
//                   ->where('status', 'pending_destination');
//             });
//         })
//         ->latest()
//         ->get();
// }
    // public function playerTransfers(int $playerId)
    // {
    //     return response()->json($this->service->getPlayerTransfers($playerId));
    // }

public function playerTransfers(int $playerId)
{

    $user = auth()->user();

    if (!$user->player) {
        abort(403, 'Usuário não é jogador.');
    }

    $associationId = $user->player->association_id;

    return response()->json(
        $this->service->getPlayerTransfers(
            $playerId,
            $associationId
        )
    );
}


public function associationTransfers(int $associationId)
{

    // $relations = [
    //     'player.user',
    //     'fromAssociation',
    //     'toAssociation',
    //     'requester',
    //     'approver',
    // ];

    // associationTransfers()
    $relations = [
        'player.user',
        'fromAssociation',
        'toAssociation',
        'requester',
        'approver',
        'documents',    // 🆕
    ];

    $outgoing = Transfer::with($relations)
        ->where('from_association_id', $associationId)
        ->latest()
        ->get()
        ->map(fn ($t) => $this->buildTransfer($t, $associationId));

    $incoming = Transfer::with($relations)
        ->where('to_association_id', $associationId)
        ->latest()
        ->get()
        ->map(fn ($t) => $this->buildTransfer($t, $associationId));

    return response()->json([
        'outgoing' => $outgoing->values(),
        'incoming' => $incoming->values(),
    ]);
}



private function buildTransfer($transfer, $associationId)
{
    $isOrigin = $transfer->from_association_id === $associationId;
    $isDestination = $transfer->to_association_id === $associationId;

    $actions = [];

    if ($isOrigin && $transfer->status === 'pending_origin') {
        $actions = ['approve_origin', 'reject_origin'];
    }

    if ($isDestination && $transfer->status === 'pending_destination') {
        $actions = ['approve_destination', 'reject_destination'];
    }

    // return [
    //     'id' => $transfer->id,
    //     'status' => $transfer->status,

    //     // 🔥 SEM AMBIGUIDADE (já resolvido corretamente)
    //     'player' => $transfer->player?->user,

    //     // 🔥 datas consistentes (NUNCA usar só "date")
    //     'created_at' => $transfer->created_at,
    //     'updated_at' => $transfer->updated_at,

    //     'from_association' => $transfer->fromAssociation,
    //     'to_association' => $transfer->toAssociation,

    //     'actions' => $actions,

    //     // contexto explícito (muito importante para frontend)
    //     'is_origin' => $isOrigin,
    //     'is_destination' => $isDestination,
    // ];

$doc = $transfer->documents->first();

if ($doc) {
    Log::info('TRANSFER DOCUMENT DEBUG', [
        'transfer_id' => $transfer->id,
        'path' => $doc->path,
        'disk' => $doc->disk,
        'url' => Storage::disk($doc->disk ?? 'public')->url($doc->path),
        'exists' => Storage::disk($doc->disk)->exists($doc->path),
    ]);
}

     return [
        'id'             => $transfer->id,
        'status'         => $transfer->status,
        'player'         => $transfer->player?->user,
        'created_at'     => $transfer->created_at,
        'updated_at'     => $transfer->updated_at,
        'from_association' => $transfer->fromAssociation,
        'to_association'   => $transfer->toAssociation,
        'actions'        => $actions,
        'is_origin'      => $isOrigin,
        'is_destination' => $isDestination,

        // 🆕 documentos com URL pública directa
        'documents' => $transfer->documents->map(fn ($d) => [
            'id' => $d->id,
            'type' => $d->type,

            'url' => ($d->path && $d->disk)
                ? Storage::disk($d->disk)->url($d->path)
                : null,

            'original_name' => $d->original_name,
            'mime_type' => $d->mime_type,
            'uploaded_at' => $d->created_at,
        ]),
    ];
}

}