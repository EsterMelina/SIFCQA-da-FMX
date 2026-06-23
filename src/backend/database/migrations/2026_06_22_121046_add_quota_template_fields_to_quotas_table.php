<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotas', function (Blueprint $table) {
            // Template global
            $table->boolean('is_global_template')->default(false)->after('status');
            $table->json('target_memberships')->nullable()->after('is_global_template');
            $table->unsignedBigInteger('template_id')->nullable()->after('target_memberships');
            $table->integer('total_installments')->default(2)->after('installment_amount');
            
            // Foreign key
            $table->foreign('template_id')->references('id')->on('quotas')->nullOnDelete();
            
            // Índice para busca
            $table->index(['association_id', 'is_global_template']);
        });
    }

    public function down(): void
    {
        Schema::table('quotas', function (Blueprint $table) {
            $table->dropForeign(['template_id']);
            $table->dropColumn([
                'is_global_template', 
                'target_memberships', 
                'template_id',
                'total_installments'
            ]);
        });
    }
};