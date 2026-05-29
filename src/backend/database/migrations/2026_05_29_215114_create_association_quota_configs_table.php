<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('association_quota_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('association_id')->unique()->constrained()->cascadeOnDelete();

            $table->decimal('annual_amount', 10, 2);        // valor anual definido pela associação
            $table->integer('installments')->default(2);    // fixo: 2 prestações
            $table->string('title_template')->default('Quota Anual {year}');
            $table->boolean('auto_generate')->default(true); // gerar automaticamente

            // janela de pagamento — quando a quota é emitida
            $table->tinyInteger('issue_month')->default(1);  // Janeiro
            $table->tinyInteger('issue_day')->default(1);
            $table->tinyInteger('due_month')->default(3);    // vence em Março
            $table->tinyInteger('due_day')->default(31);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('association_quota_configs');
    }
};
