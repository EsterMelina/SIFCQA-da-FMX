<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Services\PlayerService;
use Illuminate\Http\Request;
use App\Models\Association;
class PlayerController extends Controller
{
    protected PlayerService $service;

    public function __construct(PlayerService $service)
    {
        $this->service = $service;
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