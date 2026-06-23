<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quota_payments', function (Blueprint $table) {
            // Garantir que installment_number não seja único (várias quotas podem ter mesma prestação)
            $table->dropUnique('quota_payments_quota_id_installment_number_unique');
            // Adicionar índice composto
            $table->unique(['quota_id', 'installment_number', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('quota_payments', function (Blueprint $table) {
            $table->dropUnique('quota_payments_quota_id_installment_number_status_unique');
            $table->unique(['quota_id', 'installment_number']);
        });
    }
};