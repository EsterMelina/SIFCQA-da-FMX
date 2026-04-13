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
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
            $user = User::create([
    'name' => 'Admin',
    'email' => 'admin@fmx.com',
    'password' => Hash::make('123456'),
    'role' => 'admin' // se tens coluna também
]);

$user->assignRole('admin');
        });
    }
};
