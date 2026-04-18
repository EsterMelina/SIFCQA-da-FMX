<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReportController extends Controller
{

    public function dashboard()
    {
        try {
            return response()->json([
                'users' => User::count(),
                'active_users' => User::where('status', true)->count(),
                'roles' => DB::table('model_has_roles')->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error("Dashboard error", [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Erro ao carregar dashboard'
            ], 500);
        }    
   }
}
