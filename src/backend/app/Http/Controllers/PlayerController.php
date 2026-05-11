<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Services\PlayerService;
use Illuminate\Http\Request;
use App\Models\Association;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
class PlayerController extends Controller
{
    protected PlayerService $service;

    public function __construct(PlayerService $service)
    {
        $this->service = $service;
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


}