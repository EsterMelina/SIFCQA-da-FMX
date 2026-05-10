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
        Schema::create('transfers', function (Blueprint $table) {

            $table->id();

            /*
            |--------------------------------------------------------------------------
            | RELAÇÕES
            |--------------------------------------------------------------------------
            */

            $table->foreignId('player_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('from_association_id')
                ->constrained('associations')
                ->cascadeOnDelete();

            $table->foreignId('to_association_id')
                ->constrained('associations')
                ->cascadeOnDelete();

            $table->foreignId('requested_by')
                ->constrained('users');

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users');

            /*
            |--------------------------------------------------------------------------
            | ESTADO DA TRANSFERÊNCIA
            |--------------------------------------------------------------------------
            */

            $table->enum('status', [
                'pending_origin',
                'pending_destination',
                'approved',
                'rejected',
                'cancelled',
            ])->default('pending_origin');

            /*
            |--------------------------------------------------------------------------
            | DADOS DO PEDIDO
            |--------------------------------------------------------------------------
            */

            $table->text('reason');

            $table->string('origin_document')
                ->nullable();

            $table->string('dest_document')
                ->nullable();

            $table->text('rejection_reason')
                ->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};