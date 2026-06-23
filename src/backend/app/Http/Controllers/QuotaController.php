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
        ->where('is_global_template', false) // apenas quotas individuais, não templates
        ->latest()
        ->get();

    $data = $quotas->map(function ($q) {
        return [
            'id'                 => $q->id,
            'title'              => $q->title,
            'total_amount'       => (float) $q->total_amount,
            'paid_amount'        => (float) $q->paid_amount,
            'remaining'          => $q->remaining,
            'status'             => $q->status,
            'due_date'           => $q->due_date?->toDateString(),
            'total_installments' => $q->total_installments ?? 2,
            'installment_amount' => (float) $q->installment_amount,
            'player'             => [
                'id'   => $q->player_id,
                'name' => $q->player?->user?->name ?? "Jogador #{$q->player_id}",
            ],
            'payments_count'     => $q->payments->count(),
        ];
    });

    return response()->json(['data' => $data]);
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

/**
 * GET /api/association/quota-templates
 * Listar templates da associação
 */
public function templates(Request $request): JsonResponse
{
    $association = $this->resolveAssociation($request->user());
    $templates = $this->quotaService->getTemplates($association);
    
    return response()->json(['data' => $templates]);
}

/**
 * POST /api/association/quota-templates
 * Criar template de quota global
 */
public function storeTemplate(Request $request): JsonResponse
{
    $data = $request->validate([
        'title'              => 'required|string|max:255',
        'total_amount'       => 'required|numeric|min:0',
        'total_installments' => 'integer|min:1|max:12',
        'due_date'           => 'required|date|after:today',
        'memberships'        => 'required|array|min:1',
        'memberships.*'      => 'in:fundador,efetivo,atleta,de_mérito,honorário,patrocinador',
    ]);

    $association = $this->resolveAssociation($request->user());
    $template = $this->quotaService->createGlobalTemplate($association, $data);

    return response()->json([
        'message' => 'Template criado com sucesso.',
        'data'    => $this->quotaService->formatTemplateForAdmin($template),
    ], 201);
}

/**
 * GET /api/association/quota-templates/{quota}
 */
public function showTemplate(Quota $quota): JsonResponse
{
    if (!$quota->is_global_template) {
        abort(404, 'Template não encontrado.');
    }

    $quota->loadCount('generatedQuotas');
    $quota->load(['generatedQuotas' => function ($query) {
        $query->with('player.user')->latest()->limit(50);
    }]);

    return response()->json([
        'data' => array_merge(
            $this->quotaService->formatTemplateForAdmin($quota),
            ['generated_quotas' => $quota->generatedQuotas->map(fn($q) => [
                'id'            => $q->id,
                'player_name'   => $q->player?->user?->name,
                'total_amount'  => (float) $q->total_amount,
                'status'        => $q->status,
                'paid_amount'   => (float) $q->paid_amount,
                'membership'    => $q->player?->membership,
                'is_student'    => $q->player?->is_student,
            ])]
        ),
    ]);
}

/**
 * PUT /api/association/quota-templates/{quota}
 * Atualizar template
 */
public function updateTemplate(Request $request, Quota $quota): JsonResponse
{
    if (!$quota->is_global_template) {
        abort(404, 'Template não encontrado.');
    }

    $data = $request->validate([
        'title'                => 'sometimes|string|max:255',
        'total_amount'         => 'sometimes|numeric|min:0',
        'total_installments'   => 'sometimes|integer|min:1|max:12',
        'due_date'             => 'sometimes|date|after:today',
        'memberships'          => 'sometimes|array|min:1',
        'memberships.*'        => 'in:fundador,efetivo,atleta,de_mérito,honorário,patrocinador',
        'propagate_to_existing' => 'sometimes|boolean',
    ]);

    $propagate = $request->boolean('propagate_to_existing', false);
    $template = $this->quotaService->updateTemplate($quota, $data, $propagate);

    $action = $propagate ? 'Template actualizado e propagado.' : 'Template actualizado.';

    return response()->json([
        'message' => $action,
        'data'    => $this->quotaService->formatTemplateForAdmin($template),
    ]);
}

/**
 * PATCH /api/association/quota-templates/{quota}/cancel
 * Anular template e quotas geradas
 */
public function cancelTemplate(Request $request, Quota $quota): JsonResponse
{
    if (!$quota->is_global_template) {
        abort(404, 'Template não encontrado.');
    }

    $cancelGenerated = $request->boolean('cancel_generated', true);
    $this->quotaService->cancelTemplate($quota, $cancelGenerated);

    $message = $cancelGenerated 
        ? 'Template e quotas geradas foram anulados.'
        : 'Template anulado (quotas existentes mantidas).';

    return response()->json(['message' => $message]);
}

/**
 * POST /api/association/quota-templates/{quota}/generate
 * Gerar quotas individuais do template
 */
public function generateFromTemplate(Quota $quota): JsonResponse
{
    if (!$quota->is_global_template) {
        abort(404, 'Template não encontrado.');
    }

    $result = $this->quotaService->generateFromTemplate($quota);

    return response()->json([
        'message' => "Geradas {$result['created']} quotas. {$result['skipped']} já existiam.",
        'data'    => $result,
    ]);
}

/**
 * PUT /api/association/quotas/{quota}
 * Atualizar quota individual
 */
public function updateQuota(Request $request, Quota $quota): JsonResponse
{
    if ($quota->is_global_template) {
        abort(400, 'Use o endpoint de templates para editar quotas gerais.');
    }

    $data = $request->validate([
        'title'              => 'sometimes|string|max:255',
        'total_amount'       => 'sometimes|numeric|min:0',
        'total_installments' => 'sometimes|integer|min:1|max:12',
        'due_date'           => 'sometimes|date|after:today',
    ]);

    $quota = $this->quotaService->updateQuota($quota, $data);

    return response()->json([
        'message' => 'Quota actualizada.',
        'data'    => $this->quotaService->formatQuotaForPlayer($quota),
    ]);
}

/**
 * PATCH /api/association/quotas/{quota}/cancel
 * Anular quota individual
 */
public function cancelQuota(Quota $quota): JsonResponse
{
    if ($quota->is_global_template) {
        abort(400, 'Use o endpoint de templates para anular quotas gerais.');
    }

    $this->quotaService->cancelQuota($quota);

    return response()->json(['message' => 'Quota anulada.']);
}
}