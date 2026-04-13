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
    Schema::create('players', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
        $table->foreignId('association_id')->nullable()->constrained()->onDelete('cascade');
        $table->string('full_name');
        $table->string('email')->nullable();
        $table->date('birth_date');
        $table->string('nationality')->default('Moçambicana');
        $table->string('position')->nullable();
        $table->boolean('status')->default(true);
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
