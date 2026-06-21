<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\FmxService;
use Illuminate\Validation\ValidationException;
use App\Models\AssociationMember;
use App\Models\Player;

class FmxController extends Controller
{
    protected FmxService $service;


    
    public function __construct(FmxService $service)
    {
        $this->service = $service;
    }

    // ==================== FMX (federação única) ====================

    /**
     * Criar a FMX (apenas 1x, admin)
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'phone'         => 'nullable|string|max:30',
            'address'       => 'nullable|string|max:255',
        ]);

        try {
            $fmx = $this->service->createFmx($data);
            return response()->json($fmx, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }
    }

    /**
     * Obter os dados da FMX
     */
    public function show()
    {
        $fmx = $this->service->getFmx();

        if (!$fmx) {
            return response()->json(['message' => 'FMX não encontrada'], 404);
        }

        return response()->json($fmx);
    }

    /**
     * Atualizar a FMX existente
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'contact_email' => 'sometimes|required|email|max:255',
            'phone'         => 'nullable|string|max:30',
            'address'       => 'nullable|string|max:255',
        ]);

        try {
            $fmx = $this->service->updateFmx($data);
            return response()->json($fmx);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }
    }

    // ==================== STAFF FMX ====================

    /**
     * Criar um membro da equipa FMX
     */
    public function createStaff(Request $request)
    {
        $data = $request->validate([
            'user_id'  => 'required|exists:users,id',
            'position' => 'required|string|max:100',
            'active'   => ['sometimes', 'boolean'],
        ]);

        $staff = $this->service->createStaff($data);
        return response()->json($staff, 201);
    }

    //Update staff
    


    public function updateStaff(Request $request, int $id)
    {
        $data = $request->validate([
            'user_id'  => 'required|exists:users,id',
            'position' => 'required|string|max:100',
            'active'   => ['sometimes', 'boolean'],
        ]);

        $staff = $this->service->updateStaff($id, $data);

        return response()->json([
            'message' => 'Staff atualizado com sucesso',
            'data' => $staff
        ]);
    }


    /**
     * Listar todos os membros do staff da FMX
     */
    public function indexStaff(Request $request)
    {
        // opcional: filtrar por posição ?position=President
        $position = $request->query('position');

        $staff = $this->service->listStaff($position);
        return response()->json($staff);
    }




    // ==================== PRESIDENTE DA ASSOCIAÇÃO ====================

    /**
     * Definir/alterar o presidente de uma associação
     */
    public function assignPresident(Request $request, $associationId)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $member = $this->service->assignPresident($associationId, $data['user_id']);
        return response()->json($member);
    }

    /**
 * Ativar/desativar staff FMX
 */
public function toggleStaffStatus($staffId)
{
    $staff = $this->service->toggleStaffStatus($staffId);

    return response()->json([
        'message' => 'Estado atualizado com sucesso.',
        'data' => $staff
    ]);
}


// FmxController.php
//Buscar dados para graficos
public function playerStats()
{
    // Total e ativos
    $totalPlayers = Player::count();
    $activePlayers = Player::where('active', true)->count();

    // Trazer dados necessários com relações
    $players = Player::with(['user', 'association'])->get();

    // ======================
    // Género
    // ======================
    $genderStats = $players
        ->pluck('user.genero')
        ->filter()
        ->countBy();

    // ======================
    // Membership
    // ======================
    $membershipStats = $players
        ->pluck('membership')
        ->filter()
        ->countBy();

    // ======================
    // Associação
    // ======================
    $associationStats = $players
        ->pluck('association.name')
        ->filter()
        ->countBy();

    // ======================
    // Idade (sem SQL)
    // ======================
    $ageStats = $players
        ->map(function ($player) {
            if (!$player->user || !$player->user->dataNascimento) {
                return null;
            }

            $age = \Carbon\Carbon::parse($player->user->dataNascimento)->age;

            if ($age < 18) return 'Menor de 18';
            if ($age <= 25) return '18-25';
            if ($age <= 35) return '26-35';
            if ($age <= 50) return '36-50';
            return '51+';
        })
        ->filter()
        ->countBy();

    // ======================
    // Província (baseada no nome da associação)
    // ======================
    $provinceStats = $players
        ->pluck('association.name')
        ->filter()
        ->map(function ($name) {
            return match (true) {
                str_contains($name, 'Maputo') => 'Maputo',
                str_contains($name, 'Gaza') => 'Gaza',
                str_contains($name, 'Inhambane') => 'Inhambane',
                str_contains($name, 'Sofala') => 'Sofala',
                str_contains($name, 'Manica') => 'Manica',
                str_contains($name, 'Tete') => 'Tete',
                str_contains($name, 'Zambézia') => 'Zambézia',
                str_contains($name, 'Nampula') => 'Nampula',
                str_contains($name, 'Cabo Delgado') => 'Cabo Delgado',
                str_contains($name, 'Niassa') => 'Niassa',
                default => 'Outras',
            };
        })
        ->countBy();

    // ======================
    // Estudantes
    // ======================
    $studentCount = $players
        ->where('is_student', true)
        ->count();

    // ======================
    // Rating
    // ======================
    $ratingStats = $players
        ->pluck('rating')
        ->map(function ($rating) {
            if (is_null($rating)) return 'Sem Rating';
            if ($rating < 1200) return '1000-1200';
            if ($rating < 1500) return '1200-1500';
            if ($rating < 1800) return '1500-1800';
            if ($rating < 2000) return '1800-2000';
            return '2000+';
        })
        ->countBy();

    // ======================
    // Response final
    // ======================
    return response()->json([
        'total_players' => $totalPlayers,
        'active_players' => $activePlayers,
        'gender_distribution' => $genderStats,
        'membership_distribution' => $membershipStats,
        'association_distribution' => $associationStats,
        'age_distribution' => $ageStats,
        'province_distribution' => $provinceStats,
        'student_count' => $studentCount,
        'rating_distribution' => $ratingStats,
    ]);
}
}