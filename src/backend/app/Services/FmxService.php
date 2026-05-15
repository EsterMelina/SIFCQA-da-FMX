<?php

namespace App\Services;

use App\Models\Fmx;
use App\Models\FmxStaff;
use App\Models\AssociationMember;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Models\User;
use App\Services\AuthService;   
class FmxService
{
    protected AuthService $authService;
    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }
    // --------------------- FMX (federação) ---------------------

    /**
     * Retorna a única FMX ou null
     */
    public function getFmx(): ?Fmx
    {
        return Fmx::first();
    }

    /**
     * Criar a FMX (apenas se não existir outra)
     */
    public function createFmx(array $data): Fmx
    {
        if ($this->getFmx()) {
            throw new \Exception('FMX já existe. Utilize a atualização.');
        }

        return Fmx::create([
            'name'          => $data['name'],
            'contact_email' => $data['contact_email'],
            'phone'         => $data['phone'] ?? null,
            'address'       => $data['address'] ?? null,
        ]);
    }

    /**
     * Atualizar a FMX existente
     */
    public function updateFmx(array $data): Fmx
    {
        $fmx = $this->getFmx();

        if (!$fmx) {
            throw new \Exception('Nenhuma FMX encontrada para atualizar.');
        }

        $fmx->update([
            'name'          => $data['name'] ?? $fmx->name,
            'contact_email' => $data['contact_email'] ?? $fmx->contact_email,
            'phone'         => $data['phone'] ?? $fmx->phone,
            'address'       => $data['address'] ?? $fmx->address,
        ]);

        return $fmx->fresh();
    }

    // --------------------- STAFF FMX ---------------------

    /**
     * Criar um novo membro do staff da FMX
     * (fmx_id fixo por agora, enquanto só existe uma FMX)
     */
      /**
     * Criar ou atualizar membro do staff da FMX
     */
    // public function createStaff(array $data): FmxStaff
    // {
    //     // Obtém a FMX principal
    //     $fmx = Fmx::firstOrFail();

    //     // Cria ou atualiza o cargo do utilizador
    //     return FmxStaff::updateOrCreate(
    //         [
    //             'user_id' => $data['user_id'],
    //             'fmx_id'  => $fmx->id,
    //         ],
    //         [
    //             'position' => $data['position'],
    //         ]
    //     );
    // }

public function createStaff(array $data): FmxStaff
{
    $fmxId = Fmx::value('id');

    $staff = FmxStaff::updateOrCreate(
        [
            'user_id' => $data['user_id'],
            'fmx_id'  => $fmxId,
        ],
        [
            'position' => $data['position'],
            'active'   => $data['active'] ?? true,
        ]
    );

    $user = User::find($data['user_id']);

    if ($user && empty($user->password)) {
        $this->authService->sendInvite($user);
    }

    return $staff;
}


// updatestaff
public function updateStaff(int $id, array $data): FmxStaff
{
    $fmxId = Fmx::value('id');

    $staff = FmxStaff::where('id', $id)
        ->where('fmx_id', $fmxId)
        ->firstOrFail();

    if (isset($data['position'])) {

        FmxStaff::where('fmx_id', $fmxId)
            ->where('position', $data['position'])
            ->where('id', '!=', $id)
            ->update([
                'position' => 'member'
            ]);
    }

    $staff->update([
        
        'user_id' => $data['user_id'],
        'fmx_id'  => $fmxId,
        'position' => $data['position'] ?? $staff->position,
        'active'   => $data['active'] ?? $staff->active,
    ]);

    // 🔥 NOVO
    $user = $staff->user;

    if ($user && empty($user->password)) {
        $this->authService->sendInvite($user);
    }

    return $staff;
}

    /**
     * Listar staff da FMX, opcionalmente filtrado por posição
     */
      /**
     * Listar staff da FMX
     */
    public function listStaff(?string $position = null)
    {
        $query = FmxStaff::with('user');

        if ($position) {
            $query->where('position', $position);
        }

        return $query->get();
    }

    

    // --------------------- PRESIDENTE DA ASSOCIAÇÃO ---------------------

    /**
     * Define um novo presidente para uma associação.
     * Remove qualquer presidente anterior dessa associação.
     */
     /**
     * Definir/alterar presidente de uma associação
     */
    public function assignPresident(int $associationId, int $userId)
    {
        Log::info("Atribuindo novo presidente para a associação {$associationId}");
        Log::info("Novo presidente: user_id={$userId}");
        Log::debug("Verificando se o utilizador já é membro da associação...");
        // Remove presidente atual
        \App\Models\AssociationMember::where('association_id', $associationId)
            ->where('position', 'president')
            ->delete();

        // Cria novo presidente
        return \App\Models\AssociationMember::create([
            'user_id'        => $userId,
            'association_id' => $associationId,
            'position'       => 'president',
        ]);
    }

    public function toggleStaffStatus(int $staffId): FmxStaff
{
    $staff = FmxStaff::findOrFail($staffId);

    $staff->active = !$staff->active;

    $staff->save();

    return $staff;
}
}