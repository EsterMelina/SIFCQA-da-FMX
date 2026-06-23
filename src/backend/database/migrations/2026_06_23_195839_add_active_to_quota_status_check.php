<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Remover a constraint antiga
        DB::statement("ALTER TABLE quotas DROP CONSTRAINT IF EXISTS quotas_status_check");
        
        // Adicionar a nova constraint com TODOS os estados
        DB::statement("ALTER TABLE quotas ADD CONSTRAINT quotas_status_check CHECK (status IN ('pending', 'paid', 'rejected', 'expired', 'partially_paid', 'cancelled', 'active'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE quotas DROP CONSTRAINT IF EXISTS quotas_status_check");
        DB::statement("ALTER TABLE quotas ADD CONSTRAINT quotas_status_check CHECK (status IN ('pending', 'partially_paid', 'paid', 'expired'))");
    }
};