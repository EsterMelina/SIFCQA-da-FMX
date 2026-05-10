<?php

namespace App\Services;

use App\Models\Transfer;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

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
    public function approveByOrigin(Transfer $transfer, UploadedFile $document): Transfer
    {
        $this->assertStatus($transfer, 'pending_origin', 'Transferência não está aguardando aprovação da associação de origem.');

        $path = $document->store('transfers/origin_documents', 'public');

        $transfer->update([
            'status'            => 'pending_destination',
            'origin_document'   => $path,
        ]);

        return $transfer->fresh();
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
    */
    public function approveByDestination(Transfer $transfer, int $approverId): Transfer
    {
        $this->assertStatus($transfer, 'pending_destination', 'Transferência não está aguardando aprovação da associação de destino.');

        if (empty($transfer->origin_document)) {
            abort(422, 'Não é possível aceitar uma transferência sem documento da associação de origem.');
        }

        $transfer->update([
            'status'      => 'approved',
            'approved_by' => $approverId,
        ]);

        return $transfer->fresh();
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
    public function cancel(Transfer $transfer): Transfer
    {
        $this->assertStatus($transfer, 'pending_origin', 'Só é possível cancelar transferências pendentes na associação de origem.');

        $transfer->update(['status' => 'cancelled']);

        return $transfer->fresh();
    }

    /*
    |--------------------------------------------------------------------------
    | LISTAGEM
    |--------------------------------------------------------------------------
    */
    public function getPlayerTransfers(int $playerId)
    {
        return Transfer::with(['player', 'fromAssociation', 'toAssociation', 'requester', 'approver'])
            ->where('player_id', $playerId)
            ->latest()
            ->get();
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
}