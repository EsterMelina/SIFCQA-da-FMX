<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuditController extends Controller
{
     public function logs(Request $request)
    {
        try {
            $limit = $request->get('limit', 10);

            $logs = DB::table('audit_logs')
                ->latest()
                ->limit($limit)
                ->get();

            return response()->json($logs);
        } catch (\Throwable $e) {
            Log::error("Audit logs error", [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Erro ao carregar logs'
            ], 500);
        }
    }
}
