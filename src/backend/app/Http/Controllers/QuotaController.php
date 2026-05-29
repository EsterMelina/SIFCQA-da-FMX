<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateQuotaRequest;
use App\Http\Requests\SubmitPaymentRequest;
use App\Http\Requests\RejectPaymentRequest;
use App\Models\Quota;
use App\Models\QuotaPayment;
use App\Services\QuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\AssociationQuotaConfig;  
use App\Models\User;
use App\Models\Association;



class QuotaController extends Controller
{
    public function __construct(
        private readonly QuotaService $quotaService
    ) {}

    // ═══════════════════════════════════════════════════════
    //  ASSOCIAÇÃO — Gestão de quotas
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/association/quotas
     *
     * Cria uma quota para um jogador.
     * installment_amount é calculado automaticamente (total / 2).
     */
  public function store(CreateQuotaRequest $request, QuotaService $quotaService): JsonResponse
{
    $data = $request->validated();

    $quota = $quotaService->createQuota(
        $data,
        $request->user()
    );

    $quota->load(['player.user', 'association']);

    return response()->json([
        'message' => 'Quota criada com sucesso.',
        'data' => [
            'id' => $quota->id,
            'title' => $quota->title,
            'total_amount' => (float) $quota->total_amount,
            'installment_amount' => (float) $quota->installment_amount,
            'status' => $quota->status,
            'due_date' => $quota->due_date->toDateString(),

            'player' => [
                'id' => $quota->player->id,
                'name' => $quota->player->user->name,
            ],

            'association' => [
                'id' => $quota->association->id,
                'name' => $quota->association->name,
            ],
        ],
    ], 201);
}
    /**
     * GET /api/association/quotas
     *
     * Lista todas as quotas da associação do utilizador autenticado.
     */
    public function associationIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $associationId = $user->associationMember?->association_id;

        if (! $associationId) {
            abort(403, 'Utilizador sem associação.');
        }

        $quotas = Quota::with(['player.user', 'payments'])
            ->where('association_id', $associationId)
            ->latest()
            ->paginate(15);

        return response()->json($quotas->through(fn($q) => [
            'id'             => $q->id,
            'title'          => $q->title,
            'total_amount'   => (float) $q->total_amount,
            'paid_amount'    => (float) $q->paid_amount,
            'remaining'      => $q->remaining,
            'status'         => $q->status,
            'due_date'       => $q->due_date?->toDateString(),
            'installments'   => [
                'total'       => 2,
                'amount_each' => (float) $q->installment_amount,
            ],
            'player'         => [
                'id'   => $q->player->id,
                'name' => $q->player->user->name,
            ],
            'payments_count' => $q->payments->count(),
        ]));
    }

    /**
     * GET /api/association/quotas/{quota}
     *
     * Detalhe de uma quota (visão da associação).
     */
    public function associationShow(Quota $quota): JsonResponse
    {
        $quota->load(['player.user', 'association', 'payments.confirmedBy']);

        return response()->json([
            'data' => $this->quotaService->formatQuotaForPlayer($quota),
        ]);
    }

    // ═══════════════════════════════════════════════════════
    //  JOGADOR — Ver e pagar quotas
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/player/quotas
     *
     * Lista as quotas do jogador autenticado, com detalhe de prestações.
     */
    public function playerIndex(Request $request): JsonResponse
    {
        $player = $request->user()->player;

        if (! $player) {
            abort(403, 'Utilizador não é um jogador.');
        }

        $quotas = $this->quotaService->getPlayerQuotas($player);

        return response()->json(['data' => $quotas]);
    }

    /**
     * GET /api/player/quotas/{quota}
     *
     * Detalhe de uma quota específica do jogador.
     * Inclui as 2 prestações e o que está pendente de pagamento.
     */
    public function playerShow(Request $request, Quota $quota): JsonResponse
    {
        $player = $request->user()->player;

        if ($quota->player_id !== $player?->id) {
            abort(403, 'Não autorizado.');
        }

        $quota->load(['association', 'payments.confirmedBy']);

        return response()->json([
            'data' => $this->quotaService->formatQuotaForPlayer($quota),
        ]);
    }

    /**
     * POST /api/player/quotas/{quota}/pay
     *
     * Submete uma prestação para confirmação pela associação.
     *
     * Na 1ª vez  → o frontend apresenta o valor (installment_amount) e o jogador confirma + escolhe método.
     * Na 2ª vez  → o sistema calcula o valor automaticamente (restante), só precisa do método.
     *
     * Body:
     *   method   : cash | mpesa | emola | bank | gateway
     *   amount   : (opcional na 2ª prestação, obrigatório na 1ª para validação)
     *   reference: (opcional — referência Mpesa, etc.)
     *   notes    : (opcional)
     */
    public function pay(SubmitPaymentRequest $request, Quota $quota): JsonResponse
    {
        $player = $request->user()->player;

        if (! $player) {
            abort(403, 'Utilizador não é um jogador.');
        }

        $payment = $this->quotaService->submitPayment(
            $quota,
            $player,
            $request->validated()
        );

        $isFirst = $payment->installment_number === 1;

        return response()->json([
            'message' => $isFirst
                ? 'Primeira prestação registada. Aguarda confirmação da associação.'
                : 'Segunda prestação registada. Aguarda confirmação da associação.',
            'data' => [
                'payment' => [
                    'id'                 => $payment->id,
                    'installment_number' => $payment->installment_number,
                    'label'              => "Prestação {$payment->installment_number}",
                    'amount'             => (float) $payment->amount,
                    'method'             => $payment->method,
                    'status'             => $payment->status,
                    'reference'          => $payment->reference,
                ],
                'quota' => [
                    'id'        => $quota->id,
                    'status'    => $quota->fresh()->status,
                    'remaining' => $quota->fresh()->remaining,
                ],
            ],
        ], 201);
    }

    /**
     * GET /api/player/payments
     *
     * Histórico completo de pagamentos do jogador.
     */
    public function playerPayments(Request $request): JsonResponse
    {
        $player = $request->user()->player;

        if (! $player) {
            abort(403, 'Utilizador não é um jogador.');
        }

        $payments = QuotaPayment::with('quota.association')
            ->where('player_id', $player->id)
            ->latest()
            ->paginate(20);

        return response()->json($payments->through(fn($p) => [
            'id'                 => $p->id,
            'installment_number' => $p->installment_number,
            'label'              => "Prestação {$p->installment_number}",
            'amount'             => (float) $p->amount,
            'method'             => $p->method,
            'status'             => $p->status,
            'reference'          => $p->reference,
            'confirmed_at'       => $p->confirmed_at?->toDateTimeString(),
            'created_at'         => $p->created_at->toDateTimeString(),
            'quota' => [
                'id'           => $p->quota->id,
                'title'        => $p->quota->title,
                'association'  => $p->quota->association->name,
            ],
        ]));
    }

    // ═══════════════════════════════════════════════════════
    //  ASSOCIAÇÃO — Confirmar / Rejeitar pagamentos
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/association/payments
     *
     * Lista pagamentos pendentes da associação para aprovação.
     */
    public function pendingPayments(Request $request): JsonResponse
    {
        $user = $request->user();
        $associationId = $user->associationMember?->association_id;

        if (! $associationId) {
            abort(403, 'Utilizador sem associação.');
        }

        $payments = QuotaPayment::with(['quota', 'player.user'])
            ->whereHas('quota', fn($q) => $q->where('association_id', $associationId))
            ->where('status', 'pending')
            ->latest()
            ->paginate(20);

        return response()->json($payments->through(fn($p) => [
            'id'                 => $p->id,
            'installment_number' => $p->installment_number,
            'label'              => "Prestação {$p->installment_number}",
            'amount'             => (float) $p->amount,
            'method'             => $p->method,
            'reference'          => $p->reference,
            'status'             => $p->status,
            'created_at'         => $p->created_at->toDateTimeString(),
            'player' => [
                'id'   => $p->player->id,
                'name' => $p->player->user->name,
            ],
            'quota' => [
                'id'           => $p->quota->id,
                'title'        => $p->quota->title,
                'total_amount' => (float) $p->quota->total_amount,
                'paid_amount'  => (float) $p->quota->paid_amount,
                'remaining'    => $p->quota->remaining,
            ],
        ]));
    }

    /**
     * POST /api/association/payments/{payment}/confirm
     *
     * Confirma um pagamento e actualiza o estado da quota.
     */
    public function confirm(Request $request, QuotaPayment $payment): JsonResponse
    {
        ['payment' => $payment, 'quota' => $quota] = $this->quotaService->confirmPayment(
            $payment,
            $request->user()
        );

        return response()->json([
            'message' => 'Pagamento confirmado com sucesso.',
            'data' => [
                'payment' => [
                    'id'                 => $payment->id,
                    'installment_number' => $payment->installment_number,
                    'label'              => "Prestação {$payment->installment_number}",
                    'status'             => $payment->status,
                    'confirmed_at'       => $payment->confirmed_at->toDateTimeString(),
                    'confirmed_by'       => [
                        'id'   => $payment->confirmedBy->id,
                        'name' => $payment->confirmedBy->name,
                    ],
                ],
                'quota' => [
                    'id'           => $quota->id,
                    'status'       => $quota->status,
                    'paid_amount'  => (float) $quota->paid_amount,
                    'remaining'    => $quota->remaining,
                ],
            ],
        ]);
    }

    /**
     * POST /api/association/payments/{payment}/reject
     *
     * Rejeita um pagamento pendente.
     *
     * Body (opcional):
     *   reason: string
     */
    public function reject(RejectPaymentRequest $request, QuotaPayment $payment): JsonResponse
    {
        $payment = $this->quotaService->rejectPayment(
            $payment,
            $request->user(),
            $request->input('reason')
        );

        return response()->json([
            'message' => 'Pagamento rejeitado.',
            'data' => [
                'payment' => [
                    'id'     => $payment->id,
                    'status' => $payment->status,
                    'notes'  => $payment->notes,
                ],
            ],
        ]);
    }

    // app/Http/Controllers/QuotaController.php — ADICIONAR à classe existente

/*
|--------------------------------------------------------------------------
| CONFIGURAÇÃO GLOBAL (presidente/secretário)
|--------------------------------------------------------------------------
*/

/**
 * GET /api/association/quota-config
 */
public function getConfig(Request $request): JsonResponse
{
    $association = $this->resolveAssociation($request->user());

    $config = $this->quotaService->getOrCreateConfig($association);

    return response()->json(['data' => $this->formatConfig($config)]);
}

/**
 * PUT /api/association/quota-config
 */
public function updateConfig(Request $request): JsonResponse
{
    $request->validate([
        'annual_amount' => 'required|numeric|min:0',
        'auto_generate' => 'boolean',
        'title_template'=> 'string|max:100',
        'issue_month'   => 'integer|between:1,12',
        'issue_day'     => 'integer|between:1,31',
        'due_month'     => 'integer|between:1,12',
        'due_day'       => 'integer|between:1,31',
    ]);

    $association = $this->resolveAssociation($request->user());
    $config = $this->quotaService->updateConfig($association, $request->all());

    return response()->json([
        'message' => 'Configuração guardada.',
        'data'    => $this->formatConfig($config),
    ]);
}

/**
 * POST /api/association/quota-config/generate-now
 * Gera manualmente as quotas do ano indicado (ou corrente).
 */
public function generateNow(Request $request): JsonResponse
{
    $request->validate(['year' => 'integer|min:2020|max:2100']);

    $association = $this->resolveAssociation($request->user());
    $year = $request->input('year', now()->year);

    $result = $this->quotaService->generateAnnualQuotas($association, $year);

    return response()->json(['message' => 'Geração concluída.', 'data' => $result]);
}

// ── helpers privados ──────────────────────────────────────────────────

private function resolveAssociation(User $user): Association
{
    $id = $user->associationMember?->association_id;
    if (! $id) abort(403, 'Utilizador sem associação.');
    return Association::findOrFail($id);
}

private function formatConfig(AssociationQuotaConfig $config): array
{
    return [
        'annual_amount'  => (float) $config->annual_amount,
        'installments'   => $config->installments,
        'title_template' => $config->title_template,
        'auto_generate'  => $config->auto_generate,
        'issue_month'    => $config->issue_month,
        'issue_day'      => $config->issue_day,
        'due_month'      => $config->due_month,
        'due_day'        => $config->due_day,
    ];
}
}