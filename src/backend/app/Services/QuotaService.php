<?php

namespace App\Services;

use App\Models\Quota;
use App\Models\QuotaPayment;
use App\Models\Player;
use App\Models\User;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Models\Association;
use App\Models\AssociationQuotaConfig;
use Illuminate\Support\Facades\Hash;

class QuotaService
{
    // ═══════════════════════════════════════════════════════
    //  ASSOCIAÇÃO — Criar quota para um jogador
    // ═══════════════════════════════════════════════════════

    /**
     * Cria uma quota para um jogador.
     * installment_amount é SEMPRE total_amount / 2.
     */
public function createQuota(array $data, User $createdBy): Quota
{
    // Buscar associação ativa do utilizador
    $membership = $createdBy->associationMemberships()
        ->where('active', true)
        ->first();

    $associationId = $membership?->association_id;

    // segurança: não deixar avançar sem associação
    if (!$associationId) {
        abort(403, 'Utilizador não pertence a uma associação ativa.');
    }

    // validação de segurança de associação
    $this->ensureUserBelongsToAssociation($createdBy, $associationId);

    $total = (float) $data['total_amount'];

    if ($total <= 0) {
        throw ValidationException::withMessages([
            'total_amount' => 'O valor total deve ser maior que zero.',
        ]);
    }

    return Quota::create([
        'association_id'     => $associationId,
        'player_id'          => $data['player_id'],
        'created_by'         => $createdBy->id,
        'title'              => $data['title'],
        'total_amount'       => $total,
        'installment_amount' => round($total / 2, 2),
        'paid_amount'        => 0,
        'status'             => 'pending',
        'due_date'           => $data['due_date'],
    ]);
}

    // ═══════════════════════════════════════════════════════
    //  JOGADOR — Ver as suas quotas com prestações
    // ═══════════════════════════════════════════════════════

    /**
     * Retorna as quotas do jogador com informação completa de prestações.
     */
    public function getPlayerQuotas(Player $player): array
    {
        $quotas = Quota::with(['association', 'payments.confirmedBy'])
            ->where('player_id', $player->id)
            ->latest()
            ->get();

        return $quotas->map(fn($quota) => $this->formatQuotaForPlayer($quota))->all();
    }

    /**
     * Formata uma quota com o detalhe das prestações para o frontend.
     */
    public function formatQuotaForPlayer(Quota $quota): array
    {
        $quota->loadMissing(['association', 'payments.confirmedBy']);

        // Prestações fixas: sempre 2, sempre total/2
        $installments = $this->buildInstallmentsSummary($quota);

        return [
            'id'             => $quota->id,
            'title'          => $quota->title,
            'total_amount'   => (float) $quota->total_amount,
            'paid_amount'    => (float) $quota->paid_amount,
            'remaining'      => $quota->remaining,
            'status'         => $quota->status,

            'installments' => [
                'total'        => 2,
                'amount_each'  => (float) $quota->installment_amount,
                'next_number'  => $quota->canReceivePayment() ? $quota->next_installment_number : null,
                'can_pay'      => $quota->canReceivePayment(),
                'detail'       => $installments,
            ],

            'due_date' => $quota->due_date?->toDateString(),

            'association' => [
                'id'   => $quota->association->id,
                'name' => $quota->association->name,
            ],

            'payments' => $quota->payments->map(fn($p) => [
                'id'                 => $p->id,
                'installment_number' => $p->installment_number,
                'amount'             => (float) $p->amount,
                'method'             => $p->method,
                'status'             => $p->status,
                'reference'          => $p->reference,
                'confirmed_at'       => $p->confirmed_at?->toDateTimeString(),
                'confirmed_by'       => $p->confirmedBy ? [
                    'id'   => $p->confirmedBy->id,
                    'name' => $p->confirmedBy->name,
                ] : null,
                'created_at' => $p->created_at->toDateTimeString(),
            ]),
        ];
    }

    // ═══════════════════════════════════════════════════════
    //  JOGADOR — Submeter pagamento (primeira vez: escolhe; depois: automático)
    // ═══════════════════════════════════════════════════════

    /**
     * Regista a intenção de pagamento de uma prestação.
     *
     * Na PRIMEIRA prestação → o jogador escolhe o método e confirma o valor (sempre installment_amount).
     * Na SEGUNDA prestação  → o sistema usa o valor restante automaticamente, sem escolha.
     */
    public function submitPayment(Quota $quota, Player $player, array $data): QuotaPayment
    {
        // Segurança: confirmar que o jogador é dono desta quota
        if ($quota->player_id !== $player->id) {
            abort(403, 'Não autorizado.');
        }

        if (! $quota->canReceivePayment()) {
            throw ValidationException::withMessages([
                'quota' => 'Esta quota não aceita mais pagamentos (paga ou expirada).',
            ]);
        }

        $installmentNumber = $quota->next_installment_number;
        $amount = $this->resolveAmount($quota, $installmentNumber, $data);

        return DB::transaction(function () use ($quota, $player, $installmentNumber, $amount, $data) {
            return QuotaPayment::create([
                'quota_id'           => $quota->id,
                'player_id'          => $player->id,
                'installment_number' => $installmentNumber,
                'amount'             => $amount,
                'method'             => $data['method'],
                'status'             => 'pending',
                'reference'          => $data['reference'] ?? null,
                'notes'              => $data['notes'] ?? null,
            ]);
        });
    }

    // ═══════════════════════════════════════════════════════
    //  ASSOCIAÇÃO — Confirmar pagamento
    // ═══════════════════════════════════════════════════════

    public function confirmPayment(QuotaPayment $payment, User $confirmedBy): array
    {
        $quota = $payment->quota;

        $this->ensureUserBelongsToAssociation($confirmedBy, $quota->association_id);

        if (! $payment->isPending()) {
            throw ValidationException::withMessages([
                'payment' => "Pagamento já foi {$payment->status}.",
            ]);
        }

        return DB::transaction(function () use ($payment, $quota, $confirmedBy) {
            // 1. Confirmar o pagamento
            $payment->update([
                'status'       => 'confirmed',
                'confirmed_by' => $confirmedBy->id,
                'confirmed_at' => now(),
            ]);

            // 2. Recalcular valor pago na quota
            $totalConfirmed = $quota->confirmedPayments()->sum('amount');

            $newStatus = match (true) {
                $totalConfirmed >= $quota->total_amount => 'paid',
                $totalConfirmed > 0                    => 'partially_paid',
                default                                => 'pending',
            };

            $quota->update([
                'paid_amount' => $totalConfirmed,
                'status'      => $newStatus,
            ]);

            $quota->refresh();

            return [
                'payment' => $payment->fresh(['confirmedBy']),
                'quota'   => $quota,
            ];
        });
    }

    // ═══════════════════════════════════════════════════════
    //  ASSOCIAÇÃO — Rejeitar pagamento
    // ═══════════════════════════════════════════════════════

    public function rejectPayment(QuotaPayment $payment, User $rejectedBy, ?string $reason = null): QuotaPayment
    {
        $quota = $payment->quota;

        $this->ensureUserBelongsToAssociation($rejectedBy, $quota->association_id);

        if (! $payment->isPending()) {
            throw ValidationException::withMessages([
                'payment' => "Não é possível rejeitar um pagamento com estado '{$payment->status}'.",
            ]);
        }

        $payment->update([
            'status' => 'rejected',
            'notes'  => $reason ?? $payment->notes,
        ]);

        return $payment->fresh();
    }

    // ═══════════════════════════════════════════════════════
    //  PRIVADOS — Lógica interna
    // ═══════════════════════════════════════════════════════

    /**
     * Resolve o valor do pagamento.
     *
     * Prestação 1 → DEVE ser installment_amount (total/2).
     * Prestação 2 → é sempre o restante da quota.
     */
    private function resolveAmount(Quota $quota, int $installmentNumber, array $data): float
    {
        if ($installmentNumber === 1) {
            // Primeira prestação: valor fixo = installment_amount
            // Recebemos o valor do frontend mas validamos que bate certo.
            $submitted = isset($data['amount']) ? (float) $data['amount'] : null;

            if ($submitted !== null && abs($submitted - (float) $quota->installment_amount) > 0.01) {
                throw ValidationException::withMessages([
                    'amount' => "A primeira prestação deve ser exatamente " . number_format($quota->installment_amount, 2) . " MZN.",
                ]);
            }

            return (float) $quota->installment_amount;
        }

        // Prestação 2: valor = restante (pode diferir ligeiramente por arredondamento)
        $remaining = $quota->remaining;

        if ($remaining <= 0) {
            throw ValidationException::withMessages([
                'quota' => 'A quota já está paga.',
            ]);
        }

        return $remaining;
    }

    /**
     * Constrói o resumo visual das 2 prestações para o frontend.
     */
    private function buildInstallmentsSummary(Quota $quota): array
    {
        $payments = $quota->payments->keyBy('installment_number');

        return collect([1, 2])->map(function ($number) use ($quota, $payments) {
            $payment = $payments->get($number);

            return [
                'number'    => $number,
                'label'     => "Prestação {$number}",
                'amount'    => (float) $quota->installment_amount,
                'status'    => $payment ? $payment->status : 'not_submitted',
                'payment'   => $payment ? [
                    'id'           => $payment->id,
                    'method'       => $payment->method,
                    'status'       => $payment->status,
                    'confirmed_at' => $payment->confirmed_at?->toDateString(),
                ] : null,
            ];
        })->values()->all();
    }

    /**
     * Garante que o utilizador pertence à associação (é membro activo).
     */
    private function ensureUserBelongsToAssociation(User $user, int $associationId): void
    {
        $isMember = $user->associationMemberships()
            ->where('association_id', $associationId)
            ->where('active', true)
            ->exists();

        if (! $isMember) {
            abort(403, 'Sem permissão para esta associação.');
        }
    }


    // app/Services/QuotaService.php  — ADICIONAR estes métodos à classe existente

/*
|--------------------------------------------------------------------------
| CONFIGURAÇÃO GLOBAL DA ASSOCIAÇÃO
|--------------------------------------------------------------------------
*/

public function getOrCreateConfig(Association $association): AssociationQuotaConfig
{
    return AssociationQuotaConfig::firstOrCreate(
        ['association_id' => $association->id],
        [
            'annual_amount'    => 0,
            'installments'     => 2,
            'title_template'   => 'Quota Anual {year}',
            'auto_generate'    => false, // inactivo até a associação configurar
            'issue_month'      => 1,
            'issue_day'        => 1,
            'due_month'        => 3,
            'due_day'          => 31,
        ]
    );
}

public function updateConfig(Association $association, array $data): AssociationQuotaConfig
{
    $config = $this->getOrCreateConfig($association);

    $config->update([
        'annual_amount'  => $data['annual_amount'],
        'title_template' => $data['title_template'] ?? $config->title_template,
        'auto_generate'  => $data['auto_generate'] ?? $config->auto_generate,
        'issue_month'    => $data['issue_month']    ?? $config->issue_month,
        'issue_day'      => $data['issue_day']      ?? $config->issue_day,
        'due_month'      => $data['due_month']      ?? $config->due_month,
        'due_day'        => $data['due_day']         ?? $config->due_day,
    ]);

    return $config->fresh();
}

/*
|--------------------------------------------------------------------------
| GERAÇÃO AUTOMÁTICA — chamado pelo Artisan Command / scheduler
|--------------------------------------------------------------------------
*/

/**
 * Gera quotas para todos os jogadores activos de uma associação.
 * Idempotente: não duplica se já existir quota para o mesmo título/jogador/ano.
 */
private function systemUserId(): int
{
    return User::firstOrCreate(
        ['email' => 'system@fmx.local'],
        [
            'name' => 'System',
            'password' => Hash::make('password123'),
        ]
    )->id;
}

public function generateAnnualQuotas(Association $association, int $year): array
{
    $config = $this->getOrCreateConfig($association);

    if (! $config->auto_generate || $config->annual_amount <= 0) {
        return ['skipped' => true, 'reason' => 'auto_generate desactivado ou valor zero'];
    }

    $title   = $config->resolveTitle($year);
    $dueDate = $config->resolveDueDate($year);

    $players = $association->players()->where('active', true)->get();

    $created  = 0;
    $skipped  = 0;

    foreach ($players as $player) {
        $exists = Quota::where('association_id', $association->id)
            ->where('player_id', $player->id)
            ->where('title', $title)
            ->exists();

        if ($exists) { $skipped++; continue; }

        Quota::create([
            'association_id'     => $association->id,
            'player_id'          => $player->id,
            'created_by' => auth()->id() ?? $this->systemUserId(),
            'title'              => $title,
            'total_amount'       => $config->annual_amount,
            'installment_amount' => round($config->annual_amount / 2, 2),
            'paid_amount'        => 0,
            'status'             => 'pending',
            'due_date'           => $dueDate,
        ]);

        $created++;
    }

    return ['created' => $created, 'skipped' => $skipped, 'total_players' => $players->count()];
}

/**
 * Quando um novo jogador é adicionado a uma associação com auto_generate activo,
 * gera a quota do ano corrente se ainda não existir.
 */
public function generateForNewPlayer(Player $player, Association $association): ?Quota
{
    $config = $this->getOrCreateConfig($association);

    if (! $config->auto_generate || $config->annual_amount <= 0) {
        return null;
    }

    $year    = now()->year;
    $title   = $config->resolveTitle($year);
    $dueDate = $config->resolveDueDate($year);

    return Quota::firstOrCreate(
        [
            'association_id' => $association->id,
            'player_id'      => $player->id,
            'title'          => $title,
        ],
        [
            'created_by' => auth()->id() ?? $this->systemUserId(),
            'total_amount'       => $config->annual_amount,
            'installment_amount' => round($config->annual_amount / 2, 2),
            'paid_amount'        => 0,
            'status'             => 'pending',
            'due_date'           => $dueDate,
        ]
    );
}
}