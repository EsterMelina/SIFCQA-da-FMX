<?php

namespace Database\Seeders;

use App\Models\Transfer;
use Illuminate\Database\Seeder;

class TransferSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Transfer::create([
            'player_id'           => 1,
            'from_association_id' => 1,
            'to_association_id'   => 2,
            'requested_by'        => 1,
            'approved_by'         => null,

            'status'              => 'pending_origin',

            'reason'              => 'Desejo transferir-me para outra associação.',

            'origin_document'     => null,
            'dest_document'       => null,

            'rejection_reason'    => null,
        ]);
    }
}