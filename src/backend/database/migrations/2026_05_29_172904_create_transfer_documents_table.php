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
       // database/migrations/xxxx_create_transfer_documents_table.php
        Schema::create('transfer_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transfer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users');

            // 'origin_approval' | 'dest_approval' | 'other'
            $table->string('type', 30);

            $table->string('path');          // storage path, ex: transfers/2025/abc.pdf
            $table->string('disk')->default('public'); // 's3' em produção
            $table->string('original_name')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable(); // bytes

            $table->timestamps();

            $table->index(['transfer_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfer_documents');
    }
};
