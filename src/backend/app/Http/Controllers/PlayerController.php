<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Services\PlayerService;

class PlayerController extends Controller
{
    protected $service;

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

    // GET /players/{player}/eligibility
    public function eligibility(Player $player)
    {
        return response()->json(
            $this->service->checkEligibility($player)
        );
    }
}