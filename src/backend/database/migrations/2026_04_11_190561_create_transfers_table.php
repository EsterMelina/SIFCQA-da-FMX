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

    $table->foreignId('player_id')->constrained()->cascadeOnDelete();

    $table->foreignId('from_association_id')->constrained('associations');
    $table->foreignId('to_association_id')->constrained('associations');

    // 📄 cartas
    $table->string('letter_from_url');
    $table->string('letter_to_url');

    $table->enum('status', ['pending', 'approved', 'cancelled'])
          ->default('pending');

    $table->text('reason')->nullable();

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
