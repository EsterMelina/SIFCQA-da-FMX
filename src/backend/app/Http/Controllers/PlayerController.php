<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\AssociationMembers;
use App\Models\User;
use App\Services\PlayerService;
use Illuminate\Http\Request;
use App\Models\Association;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\Facade\Pdf as PDF2;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class PlayerController extends Controller
{
    protected PlayerService $service;

    public function __construct(PlayerService $service)
    {
        $this->service = $service;
    }

public function update(Request $request, Player $player)
{
    Log::info('UPDATE PLAYER REQUEST', [
        'player_id' => $player->id,
        'payload'   => $request->all(),
    ]);

    $data = $request->validate([
        // USER
        'name'            => 'sometimes|string|max:255',
        'email'           => 'sometimes|email|unique:users,email,' . $player->user_id,
        'genero'          => 'sometimes|in:M,F',
        'dataNascimento'  => 'sometimes|date|before:today',

        // PLAYER
        'association_id'  => 'sometimes|exists:associations,id',
        'fide-id'         => 'nullable|string|max:15',
        'rating'          => 'nullable|integer|min:0',
        'active'          => 'sometimes|boolean',
    ]);

    DB::transaction(function () use ($player, $data) {

        // ====================
        // UPDATE USER
        // ====================

        $userData = Arr::only($data, [
            'name',
            'email',
            'genero',
            'dataNascimento'
        ]);

        if (!empty($userData)) {
            $player->user->update($userData);
        }

        // ====================
        // UPDATE PLAYER
        // ====================

        $playerData = Arr::only($data, [
            'association_id',
            'fide-id',
            'rating',
            'active'
        ]);

        if (!empty($playerData)) {
            $player->update($playerData);
        }
    });

    return response()->json([
        'message' => 'Jogador atualizado com sucesso',
        'player' => $player->fresh()->load([
            'user',
            'association'
        ])
    ]);
}


//     public function indexByAssociation($associationId)
// {
//     $players = Player::with(['user', 'association'])
//         ->where('association_id', $associationId)
//         ->get()
//         ->map(function ($player) {

//             $joinedAt = $player->created_at;

//             return [
//                 'player_id' => $player->id,

//                 // USER
//                 'user_id' => $player->user->id,
//                 'name' => $player->user->name,
//                 'email' => $player->user->email,

//                 // PLAYER INFO
//                 'association_id' => $player->association_id,
//                 'association_name' => $player->association->name ?? null,
//                 'position' => $player->position,
//                 'active' => $player->active,

//                 // TEMPO NO CLUBE
//                 'joined_at' => $joinedAt,
//                 'years_in_association' => $joinedAt->diffInYears(now()),
//                 'months_in_association' => $joinedAt->diffInMonths(now()),
//                 'days_in_association' => $joinedAt->diffInDays(now()),
//             ];
//         });

//     return response()->json([
//         'association_id' => $associationId,
//         'total_players' => $players->count(),
//         'players' => $players,
//     ]);
// }
public function nationalReport()
{
    try {

        $now = now();

        $players = Player::with(['user', 'association'])->get()->map(function ($player) use ($now) {

            return [
                'player_id' => $player->id ?? '-',
                'name' => $player->user?->name ?? '-',
                'email' => $player->user?->email ?? '-',
                'association_name' => $player->association?->name ?? '-',
                'position' => $player->position ?? '-',
                'active' => $player->active ? 'Sim' : 'Não',
                'joined_at' => optional($player->created_at)->format('Y-m-d') ?? '-',
                'years_in_association' => $player->created_at?->diffInYears($now) ?? 0,
            ];
        });

        $logoPath = public_path('images/logo.png');

        $logo = file_exists($logoPath)
            ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath))
            : null;

        $pdf = Pdf::loadView('reports.players-national', [
            'players' => $players,
            'logo' => $logo,
            'generated_at' => $now->format('Y-m-d H:i:s'),
            'total' => $players->count(),
        ]);

        return $pdf->download('relatorio-nacional-jogadores.pdf');

    } catch (\Throwable $e) {
        Log::error('PDF ERROR', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ]);
        return response()->json([
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->line ?? null,
        ], 500);
    }
}

public function indexNacional()
{

    $players = Player::with(['user', 'association'])
        ->get()
        ->map(function ($player) {

            $joinedAt = $player->created_at;

            return [
                'player_id' => $player->id,
                'user_id' => $player->user->id,
                'name' => $player->user->name,
                'email' => $player->user->email,
                'association_name' => $player->association->name ?? null,
                'position' => $player->position,
                'active' => $player->active,
                'joined_at' => $joinedAt->format('Y-m-d'),
                'years_in_association' => $joinedAt->diffInYears(now()),
            ];
        });

    return response()->json([
        'total_players' => $players->count(),
        'players' => $players,
    ]);
}

    public function myProfile()
{


Log::info('REQUEST COMPLETA', [
    'method' => request()->method(),
    'url' => request()->fullUrl(),
    'headers' => request()->headers->all(),
    'body' => request()->all(),
    'ip' => request()->ip(),
]);

    $user = Auth::user();

    $player = Player::with('association')
        ->where('user_id', $user->id)
        ->first();

    if (!$player) {
        return response()->json([
            'message' => 'Jogador não encontrado'
        ], 404);
    }

    return response()->json([
        'id' => $player->id,
        'user_id' => $user->id,

        'name' => $user->name,

        'association_id' => $player->association_id,
        'association' => $player->association,

        'birth_date' => $player->birth_date,
        'birth_place' => $player->birth_place,
        'category' => $player->category,

        'license' => $player->license,
        'license_status' => $player->license_status,
        'license_valid_until' => $player->license_valid_until,
    ]);
}

//BUSCAR JOGADORES DAQUELA ASSOCIAÇÃO A PARTIR DO ID DA ASSOCIAÇÃO
public function associationPlayers($associationId)
{
    return Player::with('user', 'association')
        ->where('association_id', $associationId)
        ->get();
}

    // GET /players
   public function index(Association $association)
    {
        return response()->json(
            $this->service->getAssociationPlayers($association->id)
        );
    }

    // GET /players/{player}
    public function show(Player $player)
    {
        return response()->json(
            $this->service->getById($player)
        );
    }

    // POST /players
    public function store(Request $request, $id)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        return response()->json(
            $this->service->create($id, $data['user_id']),
            201
        );
    }

    // GET /players/{player}/eligibility
    public function eligibility(Player $player)
    {
        return response()->json(
            $this->service->checkEligibility($player)
        );
    }

//    public function suspender(Player $player)
// {
    
//     $association->players()->findOrFail($player->id);

//     return response()->json(
//         $this->service->suspender($player)
//     );
// }
// public function suspender(Player $player)
// {
//     $user = auth()->user();

// Log::info('USER DEBUG', [
//     'user_id' => $user?->id,
//     'has_association' => $user?->association,
// ]);
// Log::info('PLAYER RECEBIDO:', [
//     'player_id' => $player->id,
//     'active' => $player->active,
// ]);
// Log::info('REQUEST DATA:', request()->all());
// Log::info('DEBUG PLAYER ACTIVE', [
//     'value' => $player->active,
//     'type' => gettype($player->active),
// ]);

//     $association = auth()->user()->association;

//     // garante que o player pertence à associação logada
//     $association->players()->findOrFail($player->id);

//     $updatedPlayer = $this->service->toggleStatus($player);

//     return response()->json($updatedPlayer);
// }

public function suspender(Player $player)
{
    $user = auth()->user();

    // busca membership
    $membership = $user->associationMember;

    if (!$membership) {
        return response()->json([
            'message' => 'Utilizador não pertence a nenhuma associação.'
        ], 403);
    }

    // pega associação real
    $association = $membership->association;

    // valida se o player pertence à associação
    $association->players()->findOrFail($player->id);

    // toggle status
    $updatedPlayer = $this->service->toggleStatus($player);

    return response()->json($updatedPlayer);
}


public function delete(Player $player){
    $softDeletePlayer = $this->service->delete($player);

    return response()->json($softDeletePlayer);
}

}