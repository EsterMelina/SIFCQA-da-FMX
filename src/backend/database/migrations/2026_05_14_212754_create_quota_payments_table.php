<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quota_payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('quota_id')->constrained()->onDelete('cascade');
            $table->foreignId('player_id')->constrained()->onDelete('cascade');

            // 1 = primeira prestação | 2 = segunda prestação
            $table->unsignedTinyInteger('installment_number');

            $table->decimal('amount', 10, 2);

            $table->enum('method', [
                'cash',
                'mpesa',
                'emola',
                'bank',
                'gateway',
            ])->default('cash');

            $table->enum('status', [
                'pending',    // Submetido pelo jogador, aguarda confirmação
                'confirmed',  // Confirmado pela associação
                'rejected',   // Rejeitado pela associação
            ])->default('pending');

            // Quem confirmou (secretário / presidente)
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();

            // Para Mpesa, eMola, etc.
            $table->string('reference')->nullable();
            $table->string('external_transaction_id')->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();

            // Garante que não existe duplicado: mesma quota, mesma prestação
            $table->unique(['quota_id', 'installment_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quota_payments');
    }
};