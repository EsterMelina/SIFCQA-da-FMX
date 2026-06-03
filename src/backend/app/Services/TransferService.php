<?php

namespace App\Services;

use App\Models\Transfer;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use App\Models\TransferDocument;

class TransferService
{
    /*
    |--------------------------------------------------------------------------
    | 1. PLAYER CRIA O PEDIDO  →  status: pending_origin
    |--------------------------------------------------------------------------
    */
    public function create(array $data): Transfer
    {
        return Transfer::create([
            'player_id'           => $data['player_id'],
            'from_association_id' => $data['from_association_id'],
            'to_association_id'   => $data['to_association_id'],
            'requested_by'        => $data['requested_by'],
            'reason'              => $data['reason'],
            'status'              => 'pending_origin',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | 2a. ASSOCIAÇÃO ORIGEM APROVA SAÍDA  →  status: pending_destination
    |      Obrigatório: foto do documento de pedido
    |--------------------------------------------------------------------------
    */
    // public function approveByOrigin(Transfer $transfer, UploadedFile $document): Transfer
    // {
    //     $this->assertStatus($transfer, 'pending_origin', 'Transferência não está aguardando aprovação da associação de origem.');

    //     $path = $document->store('transfers/origin_documents', 'public');

    //     $transfer->update([
    //         'status'            => 'pending_destination',
    //         'origin_document'   => $path,
    //     ]);

    //     return $transfer->fresh();
    // }


//     public function approveByOrigin(Transfer $transfer, int $approverId): Transfer
// {
//     $this->assertStatus(
//         $transfer,
//         'pending_origin',
//         'Transferência não está aguardando aprovação da associação de origem.'
//     );

//     $transfer->update([
//         'status'      => 'pending_destination',
//         'approved_by' => $approverId,
//         'origin_document' => null, // opcional: mantém explícito
//     ]);

//     return $transfer->fresh();
// }


/*
 * 2a. Origem aprova — documento obrigatório
 */
public function approveByOrigin(
    Transfer $transfer,
    int $approverId,
    UploadedFile $document
): Transfer {
    $this->assertStatus(
        $transfer,
        'pending_origin',
        'Transferência não está aguardando aprovação da associação de origem.'
    );

    DB::transaction(function () use ($transfer, $approverId, $document) {
        $this->storeDocument($transfer, $document, 'origin_approval', $approverId);

        $transfer->update([
            'status'      => 'pending_destination',
            'approved_by' => $approverId,
        ]);
    });

    return $transfer->fresh(['documents', 'player.user', 'fromAssociation', 'toAssociation']);
}

    /*
    |--------------------------------------------------------------------------
    | 2b. ASSOCIAÇÃO ORIGEM REJEITA SAÍDA  →  status: rejected
    |--------------------------------------------------------------------------
    */
    public function rejectByOrigin(Transfer $transfer, string $reason): Transfer
    {
        $this->assertStatus($transfer, 'pending_origin', 'Transferência não está aguardando aprovação da associação de origem.');

        $transfer->update([
            'status'           => 'rejected',
            'rejection_reason' => $reason,
        ]);

        return $transfer->fresh();
    }

    /*
    |--------------------------------------------------------------------------
    | 3a. ASSOCIAÇÃO DESTINO ACEITA ENTRADA  →  status: approved
    |      Requer que o pedido já traga foto (origin_document preenchido)
    |--------------------------------------------------------------------------
//     */
//    public function approveByDestination(Transfer $transfer, int $approverId): Transfer
// {
//     $this->assertStatus(
//         $transfer,
//         'pending_destination',
//         'Transferência não está aguardando aprovação da associação de destino.'
//     );

//     // Proteção: jogador deve existir
//     $player = $transfer->player()->first();

//     if (!$player) {
//         abort(404, 'Jogador associado à transferência não encontrado.');
//     }

//     // Proteção opcional:
//     // garante que a associação destino exista
//     if (!$transfer->to_association_id) {
//         abort(422, 'Associação de destino inválida.');
//     }

//     DB::transaction(function () use ($transfer, $player, $approverId) {

//         // Atualiza associação do jogador
//         $player->update([
//             'association_id' => $transfer->to_association_id,
//         ]);

//         // Atualiza transferência
//         $transfer->update([
//             'status'      => 'approved',
//             'approved_by' => $approverId,
//         ]);
//     });

//     return $transfer->fresh([
//         'player.user',
//         'fromAssociation',
//         'toAssociation',
//         'requester',
//         'approver',
//     ]);
// }


/*
 * 3a. Destino aprova — documento obrigatório
 */
public function approveByDestination(
    Transfer $transfer,
    int $approverId,
    UploadedFile $document
): Transfer {
    $this->assertStatus(
        $transfer,
        'pending_destination',
        'Transferência não está aguardando aprovação da associação de destino.'
    );

    $player = $transfer->player()->firstOrFail();

    DB::transaction(function () use ($transfer, $player, $approverId, $document) {
        $this->storeDocument($transfer, $document, 'dest_approval', $approverId);

        $player->update(['association_id' => $transfer->to_association_id]);

        $transfer->update([
            'status'      => 'approved',
            'approved_by' => $approverId,
        ]);
    });

    return $transfer->fresh([
        'documents', 'player.user',
        'fromAssociation', 'toAssociation',
        'requester', 'approver',
    ]);
}


    /*
    |--------------------------------------------------------------------------
    | 3b. ASSOCIAÇÃO DESTINO REJEITA ENTRADA  →  status: rejected
    |--------------------------------------------------------------------------
    */
    public function rejectByDestination(Transfer $transfer, string $reason): Transfer
    {
        $this->assertStatus($transfer, 'pending_destination', 'Transferência não está aguardando aprovação da associação de destino.');

        $transfer->update([
            'status'           => 'rejected',
            'rejection_reason' => $reason,
        ]);

        return $transfer->fresh();
    }

    /*
    |--------------------------------------------------------------------------
    | PLAYER CANCELA  →  status: cancelled  (apenas enquanto pending_origin)
    |--------------------------------------------------------------------------
    */
    // public function cancel(Transfer $transfer): Transfer
    // {
    //     $this->assertStatus($transfer, 'pending_origin', 'Só é possível cancelar transferências pendentes na associação de origem.');

    //     $transfer->update(['status' => 'cancelled']);

    //     return $transfer->fresh();
    // }

    //   public function cancelOnDestination(Transfer $transfer): Transfer
    // {
    //     $this->assertStatus($transfer, 'pending_destination', 'Só é possível cancelar transferências pendentes na associação de destino.');

    //     $transfer->update(['status' => 'cancelled']);

    //     return $transfer->fresh();
    // }

    public function cancel(Transfer $transfer): Transfer
{
    if (
        $transfer->status !== 'pending_origin' &&
        $transfer->status !== 'pending_destination'
    ) {
        throw new Exception(
            'Só é possível cancelar transferências pendentes.'
        );
    }

    $transfer->update([
        'status' => 'cancelled'
    ]);

    return $transfer->fresh();
}
    /*
    |--------------------------------------------------------------------------
    | LISTAGEM
    |--------------------------------------------------------------------------
    */
    // public function getPlayerTransfers(int $playerId)
    // {
    //     return Transfer::with(['player', 'fromAssociation', 'toAssociation', 'requester', 'approver'])
    //         ->where('player_id', $playerId)
    //         ->latest()
    //         ->get();
    // }
public function getPlayerTransfers(int $playerId, int $associationId)
{
    return Transfer::with([
            'player',
            'fromAssociation',
            'toAssociation',
            'requester',
            'approver',
            'documents',     // 🔥 adicionado
        ])
        ->where('player_id', $playerId)
        ->latest()                       // 🔥 adicionado — mais recente primeiro
        ->get()
        ->map(function ($transfer) use ($associationId) {

            $actions = [];

            /*
            |--------------------------------------------------------------------------
            | ASSOCIAÇÃO DE ORIGEM
            |--------------------------------------------------------------------------
            */
            if (
                $transfer->from_association_id == $associationId &&
                $transfer->status === 'pending_origin'
            ) {
                $actions = ['approve_origin', 'reject_origin'];
            }

            /*
            |--------------------------------------------------------------------------
            | ASSOCIAÇÃO DE DESTINO
            |--------------------------------------------------------------------------
            */
            if (
                $transfer->to_association_id == $associationId &&
                $transfer->status === 'pending_destination'
            ) {
                $actions = ['approve_destination', 'reject_destination'];
            }

            return [
                'id'               => $transfer->id,
                'status'           => $transfer->status,
                'reason'           => $transfer->reason,           // 🔥 adicionado
                'rejection_reason' => $transfer->rejection_reason, // 🔥 adicionado
                'created_at'       => $transfer->created_at,       // 🔥 adicionado

                'player'           => $transfer->player,
                'from_association' => $transfer->fromAssociation,
                'to_association'   => $transfer->toAssociation,

                'requested_by'     => $transfer->requester,
                'approved_by'      => $transfer->approver,

                'actions'          => $actions,
                'is_origin'        => $transfer->from_association_id == $associationId,
                'is_destination'   => $transfer->to_association_id   == $associationId,

                // 🔥 documentos — era o que faltava para o jogador ver
                'documents' => $transfer->documents->map(fn($d) => [
                    'id'            => $d->id,
                    'type'          => $d->type,
                    'url'           => \Illuminate\Support\Facades\Storage::disk($d->disk)->url($d->path),
                    'original_name' => $d->original_name,
                    'mime_type'     => $d->mime_type,
                    'uploaded_at'   => $d->created_at,
                ]),
            ];
        })
        ->values();
}
    /*
    |--------------------------------------------------------------------------
    | HELPER PRIVADO
    |--------------------------------------------------------------------------
    */
    private function assertStatus(Transfer $transfer, string $expected, string $message): void
    {
        if ($transfer->status !== $expected) {
            abort(422, $message);
        }
    }

/*
 * Helper privado reutilizável
 */
private function storeDocument(
    Transfer $transfer,
    UploadedFile $file,
    string $type,
    int $uploadedBy
): TransferDocument {
    $path = $file->store(
        'transfers/' . $transfer->id,
        'public'          // trocar para 's3' em produção
    );

    return $transfer->documents()->create([
        'uploaded_by'   => $uploadedBy,
        'type'          => $type,
        'path'          => $path,
        'disk'          => 'public',
        'original_name' => $file->getClientOriginalName(),
        'mime_type'     => $file->getMimeType(),
        'size'          => $file->getSize(),
    ]);
}

}