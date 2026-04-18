<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Services\PlayerService;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    protected PlayerService $service;

    public function __construct(PlayerService $service)
    {
        $this->service = $service;
    }

    // GET /players
    public function index()
    {
        return response()->json(
            $this->service->getAll()
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
    public function store(Request $request)
    {
        $player = $this->service->create($request->all());

        return response()->json([
            'message' => 'Player criado com sucesso',
            'data' => $player
        ], 201);
    }

    // GET /players/{player}/eligibility
    public function eligibility(Player $player)
    {
        return response()->json(
            $this->service->checkEligibility($player)
        );
    }
}