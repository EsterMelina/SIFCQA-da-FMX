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
      Schema::create('fmx_staff', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fmx_id')->constrained('fmxes')->cascadeOnDelete();

            $table->string('position');
            $table->boolean('active')->default(true);

            $table->timestamps();

            $table->unique(['user_id', 'fmx_id']); // evita duplicação
      });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fmx_staff');
    }
};
