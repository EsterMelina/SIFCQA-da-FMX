<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            // Tipo de membro – enum para garantir valores consistentes
            $table->enum('membership', [
                'fundador',
                'efetivo',
                'atleta',
                'de_mérito',       // usa underline em vez de espaço
                'honorário',
                'patrocinador',
            ])->nullable()->after('active');

            // É estudante? (booleano)
            $table->boolean('is_student')->default(false)->after('membership');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['membership', 'is_student']);
        });
    }
};