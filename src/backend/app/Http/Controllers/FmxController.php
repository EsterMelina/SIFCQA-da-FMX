<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\FmxService;
use Illuminate\Validation\ValidationException;

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
        ]);

        $staff = $this->service->createStaff($data);
        return response()->json($staff, 201);
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
}