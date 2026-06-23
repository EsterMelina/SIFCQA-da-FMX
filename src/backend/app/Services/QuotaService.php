<?php

namespace App\Services;

use App\Models\Quota;
use App\Models\QuotaPayment;
use App\Models\Player;
use App\Models\User;
use App\Models\Association;
use App\Models\AssociationQuotaConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;

class QuotaService
{
    // ═══════════════════════════════════════════════════════
    //  TEMPLATES GLOBAIS (Quotas Gerais)
    // ═══════════════════════════════════════════════════════

    /**
     * Criar template de quota global
     */
   /**
 * Criar template de quota global
 */
public function createGlobalTemplate(Association $association, array $data): Quota
{
    // Verificar se já existe um template activo/pendente
    $existingTemplate = Quota::where('association_id', $association->id)
        ->where('is_global_template', true)
        ->whereIn('status', ['active', 'pending'])
        ->exists();

    if ($existingTemplate) {
        throw ValidationException::withMessages([
            'template' => 'Já existe uma quota geral activa. Anule-a ou conclua-a antes de criar uma nova.',
        ]);
    }

    $totalInstallments = (int) ($data['total_installments'] ?? 2);
    $totalAmount = (float) $data['total_amount'];

    return Quota::create([
        'association_id'     => $association->id,
        'created_by'         => auth()->id(),
        'title'              => $data['title'],
        'total_amount'       => $totalAmount,
        'total_installments' => $totalInstallments,
        'installment_amount' => round($totalAmount / $totalInstallments, 2),
        'paid_amount'        => 0,
        'status'             => 'active',
        'due_date'           => $data['due_date'],
        'target_memberships' => $data['memberships'] ?? [],
        'is_global_template' => true,
    ]);
}

    /**
     * Atualizar template e propagar para quotas existentes
     */
    public function updateTemplate(Quota $template, array $data, bool $propagateToExisting = false): Quota
    {
        if (!$template->is_global_template) {
            throw new \Exception('Apenas templates podem ser editados desta forma.');
        }

        $updates = [];

        if (isset($data['title'])) {
            $updates['title'] = $data['title'];
        }
        if (isset($data['total_amount'])) {
            $totalAmount = (float) $data['total_amount'];
            $totalInstallments = $data['total_installments'] ?? $template->total_installments;
            $updates['total_amount'] = $totalAmount;
            $updates['total_installments'] = $totalInstallments;
            $updates['installment_amount'] = round($totalAmount / $totalInstallments, 2);
        }
        if (isset($data['total_installments'])) {
            $updates['total_installments'] = (int) $data['total_installments'];
            $totalAmount = $data['total_amount'] ?? $template->total_amount;
            $updates['installment_amount'] = round($totalAmount / (int) $data['total_installments'], 2);
        }
        if (isset($data['due_date'])) {
            $updates['due_date'] = $data['due_date'];
        }
        if (isset($data['memberships'])) {
            $updates['target_memberships'] = $data['memberships'];
        }

        DB::transaction(function () use ($template, $updates, $propagateToExisting) {
            // Atualizar o template
            $template->update($updates);

            // Propagar para quotas existentes se solicitado
            if ($propagateToExisting) {
                $propagationData = [];
                if (isset($updates['title'])) $propagationData['title'] = $updates['title'];
                if (isset($updates['total_amount'])) {
                    $propagationData['total_amount'] = $updates['total_amount'];
                    $propagationData['installment_amount'] = $updates['installment_amount'];
                    $propagationData['total_installments'] = $updates['total_installments'];
                }
                if (isset($updates['due_date'])) $propagationData['due_date'] = $updates['due_date'];

                if (!empty($propagationData)) {
                    $template->generatedQuotas()
                        ->whereNotIn('status', ['paid', 'cancelled'])
                        ->update($propagationData);
                }
            }
        });

        return $template->fresh();
    }

    /**
     * Anular template e todas as quotas geradas
     */
    public function cancelTemplate(Quota $template, bool $cancelGenerated = true): void
    {
        if (!$template->is_global_template) {
            throw new \Exception('Apenas templates podem ser anulados.');
        }

        DB::transaction(function () use ($template, $cancelGenerated) {
            $template->update(['status' => 'cancelled']);

            if ($cancelGenerated) {
                $template->generatedQuotas()
                    ->whereNotIn('status', ['paid'])
                    ->update(['status' => 'cancelled']);
            }
        });
    }

    /**
     * Gerar quotas individuais a partir do template
     */
    public function generateFromTemplate(Quota $template): array
    {
        if (!$template->is_global_template) {
            throw new \Exception('Esta quota não é um template.');
        }

        $association = $template->association;
        $memberships = $template->target_memberships ?? [];

        if (empty($memberships)) {
            throw new \Exception('Nenhum tipo de associado selecionado.');
        }

        $players = Player::where('association_id', $association->id)
            ->whereIn('membership', $memberships)
            ->where('active', true)
            ->get();

        $created = 0;
        $skipped = 0;

        foreach ($players as $player) {
            // Verificar se já existe
            $exists = Quota::where('player_id', $player->id)
                ->where('title', $template->title)
                ->where('template_id', $template->id)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            // Calcular valor com desconto
            $amount = $this->calculateDiscountedAmount($template->total_amount, $player);
            $status = $amount === 0 ? 'paid' : 'pending';

            Quota::create([
                'association_id'     => $association->id,
                'player_id'          => $player->id,
                'created_by'         => auth()->id(),
                'template_id'        => $template->id,
                'title'              => $template->title,
                'total_amount'       => $amount,
                'total_installments' => $template->total_installments,
                'installment_amount' => $amount > 0 ? round($amount / $template->total_installments, 2) : 0,
                'paid_amount'        => 0,
                'status'             => $status,
                'due_date'           => $template->due_date,
                'is_global_template' => false,
            ]);

            $created++;
        }

        return [
            'created'        => $created,
            'skipped'        => $skipped,
            'total_players'  => $players->count(),
        ];
    }

    // ═══════════════════════════════════════════════════════
    //  QUOTAS INDIVIDUAIS
    // ═══════════════════════════════════════════════════════

    /**
     * Criar quota manual para um jogador
     */
    public function createQuota(array $data, User $createdBy): Quota
    {
        $membership = $createdBy->associationMemberships()
            ->where('active', true)
            ->first();

        $associationId = $membership?->association_id;

        if (!$associationId) {
            abort(403, 'Utilizador não pertence a uma associação ativa.');
        }

        $total = (float) $data['total_amount'];
        $totalInstallments = (int) ($data['total_installments'] ?? 2);

        if ($total <= 0) {
            throw ValidationException::withMessages([
                'total_amount' => 'O valor total deve ser maior que zero.',
            ]);
        }

        $player = Player::findOrFail($data['player_id']);
        $finalAmount = $this->calculateDiscountedAmount($total, $player);

        return Quota::create([
            'association_id'     => $associationId,
            'player_id'          => $data['player_id'],
            'created_by'         => $createdBy->id,
            'title'              => $data['title'],
            'total_amount'       => $finalAmount,
            'total_installments' => $totalInstallments,
            'installment_amount' => $finalAmount > 0 ? round($finalAmount / $totalInstallments, 2) : 0,
            'paid_amount'        => 0,
            'status'             => $finalAmount === 0 ? 'paid' : 'pending',
            'due_date'           => $data['due_date'],
        ]);
    }

    /**
     * Atualizar quota individual
     */
    public function updateQuota(Quota $quota, array $data): Quota
    {
        if ($quota->is_global_template) {
            throw new \Exception('Use updateTemplate() para templates.');
        }

        if ($quota->status === 'paid') {
            throw new \Exception('Não é possível editar uma quota já paga.');
        }

        $updates = [];

        if (isset($data['title'])) $updates['title'] = $data['title'];
        if (isset($data['total_amount'])) {
            $updates['total_amount'] = (float) $data['total_amount'];
            $updates['installment_amount'] = round((float) $data['total_amount'] / $quota->total_installments, 2);
        }
        if (isset($data['total_installments'])) {
            $updates['total_installments'] = (int) $data['total_installments'];
            $amount = $data['total_amount'] ?? $quota->total_amount;
            $updates['installment_amount'] = round($amount / (int) $data['total_installments'], 2);
        }
        if (isset($data['due_date'])) $updates['due_date'] = $data['due_date'];

        $quota->update($updates);

        return $quota->fresh();
    }

    /**
     * Anular quota individual
     */
    public function cancelQuota(Quota $quota): void
    {
        if ($quota->is_global_template) {
            throw new \Exception('Use cancelTemplate() para templates.');
        }

        if ($quota->status === 'paid') {
            throw new \Exception('Não é possível anular uma quota já paga.');
        }

        $quota->update(['status' => 'cancelled']);
    }

    // ═══════════════════════════════════════════════════════
    //  PAGAMENTOS
    // ═══════════════════════════════════════════════════════

    /**
     * Submeter pagamento (jogador escolhe a prestação)
     */
    public function submitPayment(Quota $quota, Player $player, array $data): QuotaPayment
    {
        if ($quota->player_id !== $player->id) {
            abort(403, 'Não autorizado.');
        }

        if (!$quota->canReceivePayment()) {
            throw ValidationException::withMessages([
                'quota' => 'Esta quota não aceita mais pagamentos.',
            ]);
        }

        $installmentNumber = (int) ($data['installment_number'] ?? $quota->next_installment_number);

        // Validar número da prestação
        if ($installmentNumber < 1 || $installmentNumber > $quota->total_installments) {
            throw ValidationException::withMessages([
                'installment_number' => 'Número de prestação inválido.',
            ]);
        }

        // Verificar disponibilidade
        if (!$quota->isInstallmentAvailable($installmentNumber)) {
            throw ValidationException::withMessages([
                'installment_number' => 'Esta prestação não está disponível para pagamento.',
            ]);
        }

        $amount = (float) ($data['amount'] ?? $quota->installment_amount);

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

    /**
     * Confirmar pagamento (associação)
     */
    public function confirmPayment(QuotaPayment $payment, User $confirmedBy): array
    {
        $quota = $payment->quota;

        $this->ensureUserBelongsToAssociation($confirmedBy, $quota->association_id);

        if (!$payment->isPending()) {
            throw ValidationException::withMessages([
                'payment' => "Pagamento já foi {$payment->status}.",
            ]);
        }

        return DB::transaction(function () use ($payment, $quota, $confirmedBy) {
            $payment->update([
                'status'       => 'confirmed',
                'confirmed_by' => $confirmedBy->id,
                'confirmed_at' => now(),
            ]);

            $totalConfirmed = $quota->confirmedPayments()->sum('amount');
            $confirmedCount = $quota->confirmedPayments()->count();

            $newStatus = match (true) {
                $totalConfirmed >= $quota->total_amount => 'paid',
                $confirmedCount >= $quota->total_installments => 'paid',
                $totalConfirmed > 0 => 'partially_paid',
                default => 'pending',
            };

            $quota->update([
                'paid_amount' => $totalConfirmed,
                'status'      => $newStatus,
            ]);

            return [
                'payment' => $payment->fresh(['confirmedBy']),
                'quota'   => $quota->fresh(),
            ];
        });
    }

    /**
     * Rejeitar pagamento
     */
    public function rejectPayment(QuotaPayment $payment, User $rejectedBy, ?string $reason = null): QuotaPayment
    {
        $quota = $payment->quota;
        $this->ensureUserBelongsToAssociation($rejectedBy, $quota->association_id);

        if (!$payment->isPending()) {
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
    //  LISTAGENS
    // ═══════════════════════════════════════════════════════

    /**
     * Listar templates da associação
     */
    public function getTemplates(Association $association): array
    {
        return Quota::templates()
            ->where('association_id', $association->id)
            ->withCount('generatedQuotas')
            ->latest()
            ->get()
            ->map(fn($t) => $this->formatTemplateForAdmin($t))
            ->all();
    }

    /**
     * Formatar template para resposta API
     */
    public function formatTemplateForAdmin(Quota $template): array
    {
        return [
            'id'                  => $template->id,
            'title'               => $template->title,
            'total_amount'        => (float) $template->total_amount,
            'total_installments'  => $template->total_installments,
            'installment_amount'  => (float) $template->installment_amount,
            'status'              => $template->status,
            'due_date'            => $template->due_date?->toDateString(),
            'target_memberships'  => $template->target_memberships,
            'target_labels'       => $template->target_memberships_label,
            'generated_count'     => $template->generated_quotas_count,
            'created_at'          => $template->created_at->toDateTimeString(),
            'is_global_template'  => true,
        ];
    }

    /**
     * Formatar quota para jogador
     */
    public function formatQuotaForPlayer(Quota $quota): array
    {
        $quota->loadMissing(['association', 'payments.confirmedBy']);

        // Construir prestações
        $installments = [];
        for ($i = 1; $i <= $quota->total_installments; $i++) {
            $payment = $quota->payments->firstWhere('installment_number', $i);
            $installments[] = [
                'number'    => $i,
                'label'     => "Prestação {$i}",
                'amount'    => (float) $quota->installment_amount,
                'status'    => $payment ? $payment->status : 'not_submitted',
                'can_pay'   => $quota->isInstallmentAvailable($i),
                'payment'   => $payment ? [
                    'id'           => $payment->id,
                    'method'       => $payment->method,
                    'status'       => $payment->status,
                    'confirmed_at' => $payment->confirmed_at?->toDateString(),
                ] : null,
            ];
        }

        return [
            'id'                 => $quota->id,
            'title'              => $quota->title,
            'total_amount'       => (float) $quota->total_amount,
            'paid_amount'        => (float) $quota->paid_amount,
            'remaining'          => $quota->remaining,
            'status'             => $quota->status,
            'total_installments' => $quota->total_installments,
            'installment_amount' => (float) $quota->installment_amount,
            'installments'       => $installments,
            'next_installment'   => $quota->next_installment_number,
            'can_pay'            => $quota->canReceivePayment(),
            'due_date'           => $quota->due_date?->toDateString(),
            'association'        => [
                'id'   => $quota->association->id,
                'name' => $quota->association->name,
            ],
            'has_template'       => !is_null($quota->template_id),
            'template_id'        => $quota->template_id,
        ];
    }

    /**
     * Quotas do jogador
     */
    public function getPlayerQuotas(Player $player): array
    {
        return Quota::individual()
            ->where('player_id', $player->id)
            ->active()
            ->latest()
            ->get()
            ->map(fn($q) => $this->formatQuotaForPlayer($q))
            ->all();
    }

    // ═══════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════

    /**
     * Calcular valor com desconto baseado no tipo de associado
     */
    private function calculateDiscountedAmount(float $baseAmount, Player $player): float
    {
        // Isentos
        if (in_array($player->membership, ['de_mérito', 'honorário'])) {
            return 0;
        }

        // 50% desconto para estudantes
        if ($player->is_student) {
            return round($baseAmount * 0.5, 2);
        }

        return $baseAmount;
    }

    private function systemUserId(): int
    {
        return User::firstOrCreate(
            ['email' => 'system@fmx.local'],
            ['name' => 'System', 'password' => Hash::make('password123')]
        )->id;
    }

    private function ensureUserBelongsToAssociation(User $user, int $associationId): void
    {
        $isMember = $user->associationMemberships()
            ->where('association_id', $associationId)
            ->where('active', true)
            ->exists();

        if (!$isMember) {
            abort(403, 'Sem permissão para esta associação.');
        }
    }

    // ═══════════════════════════════════════════════════════
    //  CONFIGURAÇÃO GLOBAL (mantido igual)
    // ═══════════════════════════════════════════════════════

    public function getOrCreateConfig(Association $association): AssociationQuotaConfig
    {
        return AssociationQuotaConfig::firstOrCreate(
            ['association_id' => $association->id],
            [
                'annual_amount'  => 0,
                'installments'   => 2,
                'title_template' => 'Quota Anual {year}',
                'auto_generate'  => false,
                'issue_month'    => 1,
                'issue_day'      => 1,
                'due_month'      => 3,
                'due_day'        => 31,
            ]
        );
    }

    public function updateConfig(Association $association, array $data): AssociationQuotaConfig
    {
        $config = $this->getOrCreateConfig($association);
        $config->update($data);
        return $config->fresh();
    }

    public function generateAnnualQuotas(Association $association, int $year): array
    {
        $config = $this->getOrCreateConfig($association);

        if (!$config->auto_generate || $config->annual_amount <= 0) {
            return ['skipped' => true, 'reason' => 'auto_generate desactivado ou valor zero'];
        }

        $title   = str_replace('{year}', $year, $config->title_template);
        $dueDate = "{$year}-{$config->due_month}-{$config->due_day}";

        $players = $association->players()->where('active', true)->get();

        $created = 0;
        $skipped = 0;

        foreach ($players as $player) {
            $exists = Quota::where('player_id', $player->id)
                ->where('title', $title)
                ->exists();

            if ($exists) { $skipped++; continue; }

            $amount = $this->calculateDiscountedAmount($config->annual_amount, $player);

            Quota::create([
                'association_id'     => $association->id,
                'player_id'          => $player->id,
                'created_by'         => auth()->id() ?? $this->systemUserId(),
                'title'              => $title,
                'total_amount'       => $amount,
                'total_installments' => $config->installments,
                'installment_amount' => $amount > 0 ? round($amount / $config->installments, 2) : 0,
                'paid_amount'        => 0,
                'status'             => $amount === 0 ? 'paid' : 'pending',
                'due_date'           => $dueDate,
            ]);

            $created++;
        }

        return ['created' => $created, 'skipped' => $skipped, 'total_players' => $players->count()];
    }
}