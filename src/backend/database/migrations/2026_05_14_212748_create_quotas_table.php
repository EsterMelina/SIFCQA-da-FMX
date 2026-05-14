<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('association_id')->constrained()->onDelete('cascade');
            $table->foreignId('player_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users');

            $table->string('title');
            $table->decimal('total_amount', 10, 2);

            // Sempre total / 2 — não negociável
            $table->decimal('installment_amount', 10, 2);

            $table->decimal('paid_amount', 10, 2)->default(0);

            $table->enum('status', [
                'pending',
                'partially_paid',
                'paid',
                'expired',
            ])->default('pending');

            $table->date('due_date');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotas');
    }
};

